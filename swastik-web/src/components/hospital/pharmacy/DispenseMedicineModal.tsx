'use client';

import React, { useState, useEffect } from 'react';
import {
    X,
    Pill,
    Check,
    Loader2,
    AlertCircle,
    User,
    Building2,
    Plus,
    Trash2,
    ShieldAlert,
    Clock,
    DollarSign,
    Boxes
} from 'lucide-react';

interface DispenseMedicineModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDispense: (data: Record<string, any>) => Promise<boolean>;
    prescription: any | null;
    inventory: any[];
}

export function DispenseMedicineModal({
    isOpen,
    onClose,
    onDispense,
    prescription,
    inventory,
}: DispenseMedicineModalProps) {
    const [items, setItems] = useState<Array<{
        inventoryId?: string;
        medicineName: string;
        batchNumber: string;
        quantity: number;
        unitPrice: number;
        instructions: string;
        maxStock?: number;
    }>>([]);

    const [dispenseType, setDispenseType] = useState('opd_prescription');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!prescription) {
            setItems([]);
            return;
        }

        // Determine dispense type based on encounter/admission
        if (prescription.admission_number || prescription.ward) {
            setDispenseType('ipd_ward_indent');
        } else {
            setDispenseType('opd_prescription');
        }

        // If prescription has predefined medicines
        if (Array.isArray(prescription.medicines) && prescription.medicines.length > 0) {
            const initialItems = prescription.medicines.map((m: any) => {
                const medName = m.medicine_name || m.name || '';
                const matchedInv = inventory.find(
                    (inv) => inv.medicine_name.toLowerCase().includes(medName.toLowerCase()) ||
                             (inv.generic_name && inv.generic_name.toLowerCase().includes(medName.toLowerCase()))
                );

                return {
                    inventoryId: matchedInv?.id || '',
                    medicineName: medName,
                    batchNumber: matchedInv?.batch_number || '',
                    quantity: parseInt(m.quantity, 10) || 1,
                    unitPrice: matchedInv ? parseFloat(matchedInv.selling_price) : 0,
                    instructions: m.instructions || m.dosage ? `${m.dosage || ''} ${m.frequency || ''}` : '',
                    maxStock: matchedInv ? matchedInv.stock_quantity : undefined,
                };
            });
            setItems(initialItems);
        } else if (items.length === 0) {
            // Default 1 empty row
            setItems([
                {
                    inventoryId: '',
                    medicineName: '',
                    batchNumber: '',
                    quantity: 1,
                    unitPrice: 0,
                    instructions: '',
                },
            ]);
        }
    }, [prescription, inventory]);

    if (!isOpen || !prescription) return null;

    const patient = prescription.patient;
    const doctor = prescription.doctor || prescription.attendingDoctor;

    const handleInventorySelect = (index: number, invId: string) => {
        const matched = inventory.find((i) => i.id === invId);
        if (!matched) return;

        setItems((prev) => {
            const copy = [...prev];
            copy[index] = {
                ...copy[index],
                inventoryId: matched.id,
                medicineName: matched.medicine_name,
                batchNumber: matched.batch_number || '',
                unitPrice: parseFloat(matched.selling_price) || 0,
                maxStock: matched.stock_quantity,
            };
            return copy;
        });
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        setItems((prev) => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: value };
            return copy;
        });
    };

    const handleAddItem = () => {
        setItems((prev) => [
            ...prev,
            {
                inventoryId: '',
                medicineName: '',
                batchNumber: '',
                quantity: 1,
                unitPrice: 0,
                instructions: '',
            },
        ]);
    };

    const handleRemoveItem = (index: number) => {
        if (items.length <= 1) return;
        setItems((prev) => prev.filter((_, i) => i !== index));
    };

    const totalBillAmount = items.reduce((sum, item) => {
        return sum + (item.quantity * item.unitPrice || 0);
    }, 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const validItems = items.filter((i) => i.medicineName.trim());
        if (validItems.length === 0) {
            setError('Please add at least one valid medication to dispense');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const success = await onDispense({
                patientId: patient?.id || prescription.patient_id,
                encounterId: prescription.encounter_id || (prescription.chief_complaint ? prescription.id : undefined),
                admissionId: prescription.admission_id || (prescription.admission_number ? prescription.id : undefined),
                prescriptionId: prescription.prescription_id || prescription.id || undefined,
                dispenseType,
                items: validItems,
                notes: notes.trim() || undefined,
            });

            if (success) {
                onClose();
            }
        } catch (err: any) {
            setError(err.message || 'Dispensing failed');
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

                <div className="relative w-full max-w-3xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-gray-800 p-6 z-10 space-y-4">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800 pb-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold">
                                <Pill className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                    Dispense Hospital Prescription
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    Verify stock, validate dosage and dispense medications with encounter billing.
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

                    {/* Patient Safety Verification Banner */}
                    <div className="p-3.5 bg-slate-50/80 dark:bg-gray-800/50 rounded-2xl border border-slate-200/70 dark:border-gray-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-2xl bg-teal-600 text-white font-bold flex items-center justify-center text-sm shadow-2xs">
                                {patient?.name ? patient.name[0].toUpperCase() : 'P'}
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                    {patient?.name || 'Patient'}
                                </h4>
                                <p className="text-[11px] text-slate-500">
                                    {patient?.gender ? `${patient.gender} • ` : ''}
                                    {patient?.age ? `Age: ${patient.age} ` : ''}
                                    {prescription.admission_number && (
                                        <span className="font-mono text-teal-700 dark:text-teal-400 font-semibold">
                                            • IPD: {prescription.admission_number} ({prescription.ward?.name || 'Ward'})
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="text-right text-xs">
                            <span className="text-[10px] text-slate-400 block">Prescribed By</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                                Dr. {doctor?.name || 'Duty Medical Officer'}
                            </span>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                        
                        {/* Dispense Lines */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400">
                                    Medication Dispensing Lines ({items.length})
                                </span>
                                <button
                                    type="button"
                                    onClick={handleAddItem}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add Medication</span>
                                </button>
                            </div>

                            <div className="space-y-2 max-h-60 overflow-y-auto p-1">
                                {items.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="p-3 bg-slate-50 dark:bg-gray-800/40 rounded-2xl border border-slate-200/60 dark:border-gray-700 space-y-2"
                                    >
                                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                            {/* Select Inventory or Enter Medicine */}
                                            <div className="sm:col-span-5">
                                                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                                                    Hospital Stock Item / Medicine <span className="text-rose-500">*</span>
                                                </label>
                                                <select
                                                    value={item.inventoryId || ''}
                                                    onChange={(e) => handleInventorySelect(idx, e.target.value)}
                                                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                                                >
                                                    <option value="">Select from In-House Stock...</option>
                                                    {inventory.map((inv) => (
                                                        <option key={inv.id} value={inv.id}>
                                                            {inv.medicine_name} ({inv.category}) — Stock: {inv.stock_quantity} {inv.unit} (₹{inv.selling_price})
                                                        </option>
                                                    ))}
                                                </select>
                                                {!item.inventoryId && (
                                                    <input
                                                        type="text"
                                                        placeholder="Or type medicine name..."
                                                        value={item.medicineName}
                                                        onChange={(e) => handleItemChange(idx, 'medicineName', e.target.value)}
                                                        className="w-full mt-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
                                                        required
                                                    />
                                                )}
                                            </div>

                                            {/* Batch */}
                                            <div className="sm:col-span-2">
                                                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                                                    Batch No.
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Batch"
                                                    value={item.batchNumber}
                                                    onChange={(e) => handleItemChange(idx, 'batchNumber', e.target.value)}
                                                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
                                                />
                                            </div>

                                            {/* Quantity */}
                                            <div className="sm:col-span-2">
                                                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                                                    Quantity <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                                                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
                                                    required
                                                />
                                            </div>

                                            {/* Unit Price */}
                                            <div className="sm:col-span-2">
                                                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                                                    Price (₹)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={item.unitPrice}
                                                    onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
                                                />
                                            </div>

                                            {/* Remove */}
                                            <div className="sm:col-span-1 flex items-end justify-center pb-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveItem(idx)}
                                                    disabled={items.length <= 1}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Stock Availability Indicator */}
                                        {item.maxStock !== undefined && (
                                            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/40 dark:border-gray-700/40">
                                                <span className={`font-semibold ${
                                                    item.maxStock >= item.quantity
                                                        ? 'text-emerald-700 dark:text-emerald-400'
                                                        : 'text-rose-600 dark:text-rose-400 font-bold'
                                                }`}>
                                                    {item.maxStock >= item.quantity
                                                        ? `✓ In Stock: ${item.maxStock} available`
                                                        : `⚠️ Low Stock: Only ${item.maxStock} available (Partial Dispensing)`}
                                                </span>
                                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                                    Line Total: ₹{(item.quantity * item.unitPrice).toFixed(2)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Dispensation Notes & Summary */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-gray-800">
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Pharmacist / Dispensing Notes
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Advised after meals, 10 tablets substituted"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40 text-xs"
                                />
                            </div>

                            <div className="p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-2xl flex flex-col justify-between">
                                <span className="text-[10px] text-teal-800 dark:text-teal-300 font-semibold uppercase">
                                    Total Medication Charge
                                </span>
                                <div className="flex items-baseline justify-between">
                                    <span className="text-xl font-bold font-mono text-teal-700 dark:text-teal-300">
                                        ₹{totalBillAmount.toFixed(2)}
                                    </span>
                                    <span className="text-[10px] text-teal-700 dark:text-teal-400">
                                        Auto-billed to encounter
                                    </span>
                                </div>
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
                                disabled={loading || items.length === 0}
                                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                            >
                                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                <span>Confirm Dispensing</span>
                            </button>
                        </div>

                    </form>

                </div>
            </div>
        </div>
    );
}
