'use client';

import { useCallback, useDeferredValue, useEffect, useRef, useState } from 'react';
import {
    AlertCircle, AlertTriangle, ArrowLeft, CheckCircle, ChevronRight,
    ClipboardList, Clock, ExternalLink, Eye, FileText, Loader2,
    Package, RefreshCw, Search, Shield, ShoppingBag, Stethoscope,
    Thermometer, User, XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { pharmacyApi } from '@/lib/api';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import { useToast } from '@/components/ui/Toast';

const PAGE_SIZE = 15;

// ─── Types ───────────────────────────────────────────────────────────────────

type PrescriptionStatus = 'active' | 'expired' | 'fulfilled' | 'pending' | string;
type FilterTab = 'all' | 'pending' | 'dispensed';

interface PrescriptionMedicine {
    id: string;
    medicine_name: string;
    generic_name: string | null;
    dosage: string | null;
    frequency: string | null;
    duration: string | null;
    quantity: number;
    before_food: boolean | null;
    instructions: string | null;
    is_critical: boolean | null;
}

interface InventoryMatch {
    inventory_id: string;
    name: string;
    generic_name: string | null;
    medicine_id: string | null;
    quantity: number;
    reserved_quantity: number;
    available_quantity: number;
    batch_number: string | null;
    expiry_date: string | null;
    price: number;
    mrp: number;
    is_low_stock: boolean;
}

interface InventoryCheckResult {
    prescription_medicine_id: string;
    medicine_name: string;
    generic_name: string | null;
    requested_quantity: number;
    availability_status: 'available' | 'partial' | 'unavailable';
    available_quantity: number;
    inventory_matches: InventoryMatch[];
}

interface InventoryCheckSummary {
    total_medicines: number;
    available: number;
    partial: number;
    unavailable: number;
    overall_status: 'all_available' | 'partial' | 'unavailable';
}

interface PrescriptionDetail {
    id: string;
    prescription_number: string;
    status: PrescriptionStatus;
    is_dispensed: boolean;
    dispensed_at: string | null;
    diagnosis: string | null;
    instructions: string | null;
    dietary_advice: string | null;
    lifestyle_advice: string | null;
    notes: string | null;
    valid_from: string | null;
    valid_until: string | null;
    file_url: string | null;
    pdf_url: string | null;
    created_at: string;
    updated_at: string;
    prescription_medicines: PrescriptionMedicine[];
    patients: { id: string; name: string; gender: string | null; date_of_birth: string | null } | null;
    doctors: { id: string; name: string; specialization: string | null; phone: string | null } | null;
    linked_order: {
        id: string;
        status: string;
        payment_status: string;
        total_amount: number;
        created_at: string;
    };
    origin: {
        source: string;
        clinic_id: string | null;
        clinic_name: string | null;
        hospital_id: string | null;
        hospital_name: string | null;
    };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getPrescriptionStatusStyle(status: PrescriptionStatus): { bg: string; text: string; label: string } {
    switch (status) {
        case 'active': return { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', label: 'Active' };
        case 'fulfilled': return { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', label: 'Fulfilled' };
        case 'expired': return { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', label: 'Expired' };
        default: return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300', label: status };
    }
}

function getAvailabilityStyle(status: InventoryCheckResult['availability_status']): { icon: React.ReactNode; color: string; label: string } {
    switch (status) {
        case 'available':
            return { icon: <CheckCircle className="h-4 w-4" />, color: 'text-emerald-600 dark:text-emerald-400', label: 'Available' };
        case 'partial':
            return { icon: <AlertTriangle className="h-4 w-4" />, color: 'text-amber-600 dark:text-amber-400', label: 'Partial Stock' };
        case 'unavailable':
            return { icon: <XCircle className="h-4 w-4" />, color: 'text-red-600 dark:text-red-400', label: 'Unavailable' };
    }
}

function OriginBadge({ origin }: { origin: PrescriptionDetail['origin'] }) {
    const isClinic = !!origin.clinic_id;
    const isHospital = !!origin.hospital_id;
    const label = origin.clinic_name || origin.hospital_name || origin.source;
    const bg = isClinic ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
        : isHospital ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400'
        : origin.source === 'POS / Walk-in' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';

    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${bg}`}>
            {isClinic ? <Stethoscope className="h-3 w-3" />
                : isHospital ? <Shield className="h-3 w-3" />
                : <User className="h-3 w-3" />}
            {label}
        </span>
    );
}

// ─── Medicine Row in Detail ──────────────────────────────────────────────────

function MedicineDetailRow({
    med,
    invResult,
}: {
    med: PrescriptionMedicine;
    invResult: InventoryCheckResult | undefined;
}) {
    const [expanded, setExpanded] = useState(false);
    const avail = invResult ? getAvailabilityStyle(invResult.availability_status) : null;

    return (
        <div className="rounded-xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
            <button
                onClick={() => setExpanded((e) => !e)}
                className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className="flex-shrink-0 rounded-lg bg-orange-100 dark:bg-orange-900/30 p-2">
                        <Thermometer className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{med.medicine_name}</p>
                            {med.is_critical && (
                                <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded-full font-medium">Critical</span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {med.generic_name || 'No generic name'} · Qty: {med.quantity}
                            {med.dosage ? ` · ${med.dosage}` : ''}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                    {avail ? (
                        <span className={`flex items-center gap-1 text-xs font-medium ${avail.color}`}>
                            {avail.icon} {avail.label}
                        </span>
                    ) : (
                        <span className="text-xs text-gray-400">Checking...</span>
                    )}
                    <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                </div>
            </button>

            {expanded && (
                <div className="border-t border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30 p-4 space-y-4">
                    {/* Prescription Details */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: 'Frequency', value: med.frequency },
                            { label: 'Duration', value: med.duration },
                            { label: 'Before Food', value: med.before_food === true ? 'Yes' : med.before_food === false ? 'No' : '—' },
                            { label: 'Quantity', value: String(med.quantity) },
                        ].map(({ label, value }) => (
                            <div key={label}>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">{value || '—'}</p>
                            </div>
                        ))}
                    </div>
                    {med.instructions && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Instructions: </span>{med.instructions}
                        </div>
                    )}

                    {/* Inventory Matches */}
                    {invResult && invResult.inventory_matches.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Available Batches</p>
                            <div className="space-y-2">
                                {invResult.inventory_matches.map((inv) => {
                                    const isExpiringSoon = inv.expiry_date && new Date(inv.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                                    return (
                                        <div key={inv.inventory_id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-800">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {inv.batch_number && (
                                                            <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                                                                Batch: {inv.batch_number}
                                                            </span>
                                                        )}
                                                        {inv.medicine_id && (
                                                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ Catalog Linked</span>
                                                        )}
                                                        {inv.is_low_stock && (
                                                            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Low Stock</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 flex-wrap">
                                                        <span>Available: <strong className="text-gray-900 dark:text-gray-100">{inv.available_quantity}</strong></span>
                                                        {inv.expiry_date && (
                                                            <span className={isExpiringSoon ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}>
                                                                Exp: {formatDate(inv.expiry_date)}
                                                                {isExpiringSoon ? ' ⚠' : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">₹{inv.price}</p>
                                                    {inv.mrp !== inv.price && (
                                                        <p className="text-xs text-gray-400 line-through">₹{inv.mrp}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {invResult && invResult.inventory_matches.length === 0 && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
                            <Package className="h-4 w-4 flex-shrink-0" />
                            No matching inventory found for this medicine
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Prescription Detail Panel ────────────────────────────────────────────────

function PrescriptionDetailPanel({
    prescriptionId,
    onClose,
    onDispenseSuccess,
}: {
    prescriptionId: string;
    onClose: () => void;
    onDispenseSuccess: () => void;
}) {
    const toast = useToast();
    const [detail, setDetail] = useState<PrescriptionDetail | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(true);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [invCheck, setInvCheck] = useState<InventoryCheckResult[] | null>(null);
    const [invSummary, setInvSummary] = useState<InventoryCheckSummary | null>(null);
    const [loadingInv, setLoadingInv] = useState(false);
    const [dispenseLoading, setDispenseLoading] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setLoadingDetail(true);
        setDetailError(null);
        setDetail(null);
        setInvCheck(null);
        setInvSummary(null);
        pharmacyApi.getPrescriptionDetail(prescriptionId)
            .then((res: any) => {
                if (res.success) {
                    setDetail(res.data);
                } else {
                    setDetailError(res.error || 'Failed to load prescription');
                }
            })
            .catch(() => setDetailError('Network error. Please try again.'))
            .finally(() => setLoadingDetail(false));
    }, [prescriptionId]);

    const runInventoryCheck = async () => {
        setLoadingInv(true);
        try {
            const res: any = await pharmacyApi.getPrescriptionInventoryCheck(prescriptionId);
            if (res.success) {
                setInvCheck(res.data);
                setInvSummary(res.summary);
                toast.success('Inventory checked', `${res.summary.available} of ${res.summary.total_medicines} medicines available`);
            } else {
                toast.error('Check failed', res.error || 'Could not check inventory');
            }
        } catch {
            toast.error('Check failed', 'Network error');
        } finally {
            setLoadingInv(false);
        }
    };

    const handleDispense = async () => {
        if (!detail) return;
        setDispenseLoading(true);
        try {
            const res: any = await pharmacyApi.dispensePrescription(prescriptionId);
            if (res.success) {
                toast.success('Prescription Dispensed', `${detail.prescription_number} marked as fulfilled`);
                onDispenseSuccess();
            } else {
                toast.error('Dispense Failed', res.error || 'Could not mark as dispensed');
            }
        } catch {
            toast.error('Dispense Failed', 'Network error');
        } finally {
            setDispenseLoading(false);
        }
    };

    const invResultMap = new Map(invCheck?.map((r) => [r.prescription_medicine_id, r]));

    if (loadingDetail) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        );
    }

    if (detailError || !detail) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-center p-6">
                <AlertCircle className="h-10 w-10 text-red-400" />
                <p className="text-sm text-red-600 dark:text-red-400">{detailError || 'Prescription not found'}</p>
                <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Go back</button>
            </div>
        );
    }

    const { bg: statusBg, text: statusText, label: statusLabel } = getPrescriptionStatusStyle(detail.status);
    const canDispense = !detail.is_dispensed && detail.status !== 'expired';
    const isExpired = detail.status === 'expired';

    return (
        <div ref={panelRef} className="h-full flex flex-col overflow-hidden">
            {/* Panel Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400 lg:hidden"
                >
                    <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-900 dark:text-gray-100 truncate">{detail.prescription_number}</p>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBg} ${statusText}`}>
                            {statusLabel}
                        </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatDate(detail.created_at)}</p>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Expiry Warning */}
                {isExpired && (
                    <div className="flex items-start gap-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-red-700 dark:text-red-300">
                            This prescription expired on {formatDate(detail.valid_until)}.
                            It cannot be fulfilled.
                        </p>
                    </div>
                )}

                {/* Inventory Summary Banner */}
                {invSummary && (
                    <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
                        invSummary.overall_status === 'all_available'
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                            : invSummary.overall_status === 'partial'
                            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    }`}>
                        {invSummary.overall_status === 'all_available'
                            ? <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                            : invSummary.overall_status === 'partial'
                            ? <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                            : <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />}
                        <p className={`text-sm font-medium ${
                            invSummary.overall_status === 'all_available' ? 'text-emerald-700 dark:text-emerald-300'
                            : invSummary.overall_status === 'partial' ? 'text-amber-700 dark:text-amber-300'
                            : 'text-red-700 dark:text-red-300'
                        }`}>
                            {invSummary.overall_status === 'all_available' ? 'All medicines available in stock'
                                : invSummary.overall_status === 'partial' ? `${invSummary.available} available, ${invSummary.partial} partial, ${invSummary.unavailable} unavailable`
                                : 'No medicines found in inventory'}
                        </p>
                    </div>
                )}

                {/* Origin */}
                <section>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Origin</p>
                    <div className="flex items-center gap-2 flex-wrap">
                        <OriginBadge origin={detail.origin} />
                        {detail.origin.clinic_name && (
                            <span className="text-sm text-gray-700 dark:text-gray-300">{detail.origin.clinic_name}</span>
                        )}
                        {detail.origin.hospital_name && (
                            <span className="text-sm text-gray-700 dark:text-gray-300">{detail.origin.hospital_name}</span>
                        )}
                    </div>
                </section>

                {/* Validity */}
                {(detail.valid_from || detail.valid_until) && (
                    <section>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Validity</p>
                        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            {formatDate(detail.valid_from)} — {formatDate(detail.valid_until)}
                        </div>
                    </section>
                )}

                {/* Patient */}
                {detail.patients && (
                    <section>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Patient</p>
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                                <User className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{detail.patients.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {detail.patients.gender || ''}{detail.patients.gender && detail.patients.date_of_birth ? ' · ' : ''}{detail.patients.date_of_birth ? `DOB: ${formatDate(detail.patients.date_of_birth)}` : ''}
                                </p>
                            </div>
                        </div>
                    </section>
                )}

                {/* Doctor */}
                {detail.doctors && (
                    <section>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Prescribing Doctor</p>
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                                <Stethoscope className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">Dr. {detail.doctors.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{detail.doctors.specialization || ''}</p>
                            </div>
                        </div>
                    </section>
                )}

                {/* Diagnosis */}
                {detail.diagnosis && (
                    <section>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Diagnosis</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{detail.diagnosis}</p>
                    </section>
                )}

                {/* Medicines */}
                <section>
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Medicines ({detail.prescription_medicines.length})
                        </p>
                        <button
                            onClick={runInventoryCheck}
                            disabled={loadingInv}
                            className="flex items-center gap-1.5 text-xs font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 disabled:opacity-50 transition-colors"
                        >
                            {loadingInv ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Package className="h-3.5 w-3.5" />}
                            {invCheck ? 'Re-check Inventory' : 'Check Inventory'}
                        </button>
                    </div>
                    <div className="space-y-2">
                        {detail.prescription_medicines.map((med) => (
                            <MedicineDetailRow
                                key={med.id}
                                med={med}
                                invResult={invResultMap.get(med.id)}
                            />
                        ))}
                        {detail.prescription_medicines.length === 0 && (
                            <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
                                No medicines listed in this prescription
                            </div>
                        )}
                    </div>
                </section>

                {/* Clinical Notes */}
                {(detail.instructions || detail.dietary_advice || detail.lifestyle_advice || detail.notes) && (
                    <section>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Clinical Notes</p>
                        <div className="space-y-2">
                            {detail.instructions && (
                                <div className="rounded-lg border border-gray-100 dark:border-gray-700 p-3 bg-gray-50/50 dark:bg-gray-800/30">
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Instructions</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">{detail.instructions}</p>
                                </div>
                            )}
                            {detail.dietary_advice && (
                                <div className="rounded-lg border border-gray-100 dark:border-gray-700 p-3 bg-gray-50/50 dark:bg-gray-800/30">
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Dietary Advice</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">{detail.dietary_advice}</p>
                                </div>
                            )}
                            {detail.lifestyle_advice && (
                                <div className="rounded-lg border border-gray-100 dark:border-gray-700 p-3 bg-gray-50/50 dark:bg-gray-800/30">
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Lifestyle Advice</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">{detail.lifestyle_advice}</p>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* Prescription Document */}
                {(detail.file_url || detail.pdf_url) && (
                    <section>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Document</p>
                        <a
                            href={detail.file_url || detail.pdf_url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors"
                        >
                            <FileText className="h-4 w-4" />
                            View Prescription Document
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    </section>
                )}

                {/* Linked Order */}
                <section>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Linked Order</p>
                    <Link
                        href="/pharmacy/orders"
                        className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 dark:border-gray-700 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-orange-100 dark:bg-orange-900/30 p-2">
                                <ShoppingBag className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Order</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{detail.linked_order.status} · ₹{detail.linked_order.total_amount}</p>
                            </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                    </Link>
                </section>
            </div>

            {/* Action Bar */}
            <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-800 px-6 py-4 bg-white dark:bg-gray-900">
                {detail.is_dispensed ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium py-2">
                        <CheckCircle className="h-4 w-4" />
                        Dispensed on {formatDate(detail.dispensed_at)}
                    </div>
                ) : isExpired ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-red-600 dark:text-red-400 font-medium py-2">
                        <XCircle className="h-4 w-4" />
                        Prescription expired — cannot fulfill
                    </div>
                ) : (
                    <div className="flex gap-3">
                        {!invCheck && (
                            <button
                                onClick={runInventoryCheck}
                                disabled={loadingInv}
                                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-400 py-2.5 text-sm font-medium hover:bg-orange-50 dark:hover:bg-orange-900/20 disabled:opacity-50 transition-colors"
                            >
                                {loadingInv ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
                                Check Inventory
                            </button>
                        )}
                        {canDispense && (
                            <button
                                onClick={handleDispense}
                                disabled={dispenseLoading}
                                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors shadow-sm"
                            >
                                {dispenseLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                Mark as Dispensed
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Prescription Card ─────────────────────────────────────────────────────

function PrescriptionCard({
    prescription,
    isSelected,
    onClick,
}: {
    prescription: any;
    isSelected: boolean;
    onClick: () => void;
}) {
    const status: PrescriptionStatus = prescription.status || (prescription.is_dispensed ? 'fulfilled' : 'pending');
    const { bg, text, label } = getPrescriptionStatusStyle(status);
    const medicineCount = prescription.medications?.length ?? prescription.prescription_medicines?.length ?? 0;
    const patientName = prescription.patientName || prescription.patients?.name || 'Patient';
    const doctorName = prescription.doctorName || prescription.doctors?.name || '';
    const date = prescription.date || prescription.created_at || '';

    return (
        <button
            onClick={onClick}
            className={`w-full text-left p-4 transition-all border-b border-gray-100 dark:border-gray-800 ${
                isSelected
                    ? 'bg-orange-50 dark:bg-orange-900/10 border-l-2 border-l-orange-500'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-l-2 border-l-transparent'
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`flex-shrink-0 rounded-xl p-2.5 mt-0.5 ${isSelected ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                        <FileText className={`h-4 w-4 ${isSelected ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{patientName}</p>
                            {prescription.is_dispensed && (
                                <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                            )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                            {doctorName ? `Dr. ${doctorName}` : 'Doctor'} · {medicineCount} medicine{medicineCount !== 1 ? 's' : ''}
                        </p>
                        {date && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatDate(date)}</p>
                        )}
                    </div>
                </div>
                <span className={`flex-shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${bg} ${text}`}>
                    {label}
                </span>
            </div>
        </button>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PharmacyPrescriptionsPage() {
    const { prescriptions, prescriptionsPagination, loadingPrescriptions, error, fetchPrescriptions, clearError } = usePharmacyStore();
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const deferredSearch = useDeferredValue(searchQuery.trim());
    const [tab, setTab] = useState<FilterTab>('all');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [mobileShowDetail, setMobileShowDetail] = useState(false);

    const load = useCallback(() => {
        void fetchPrescriptions({
            page,
            limit: PAGE_SIZE,
            search: deferredSearch || undefined,
            status: tab === 'all' ? undefined : tab,
        });
    }, [deferredSearch, fetchPrescriptions, page, tab]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { setPage(1); setSelectedId(null); }, [deferredSearch, tab]);

    const handleSelectPrescription = (id: string) => {
        setSelectedId(id);
        setMobileShowDetail(true);
    };

    const handleCloseDetail = () => {
        setMobileShowDetail(false);
        // On desktop, keep it selected but hide on mobile
    };

    const handleDispenseSuccess = () => {
        load();
        setSelectedId(null);
        setMobileShowDetail(false);
    };

    const TABS: { key: FilterTab; label: string }[] = [
        { key: 'all', label: 'All' },
        { key: 'pending', label: 'Pending' },
        { key: 'dispensed', label: 'Dispensed' },
    ];

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col">
            {/* Page Header */}
            <div className="flex-shrink-0 px-6 py-5 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Prescriptions</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            Review incoming prescriptions and fulfill medicines from your pharmacy.
                        </p>
                    </div>
                    <button
                        onClick={load}
                        disabled={loadingPrescriptions}
                        className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                    >
                        <RefreshCw className={`h-4 w-4 ${loadingPrescriptions ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2.5">
                        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                        <button onClick={() => { clearError(); load(); }} className="ml-auto text-xs text-red-600 dark:text-red-400 font-medium">Retry</button>
                    </div>
                )}

                {/* Filters + Search */}
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
                        {TABS.map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setTab(key)}
                                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                                    tab === key
                                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by patient, doctor, or prescription ID…"
                            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 dark:focus:ring-orange-600"
                        />
                    </div>
                </div>
            </div>

            {/* Body: Split panel */}
            <div className="flex-1 flex min-h-0">
                {/* Left — Prescription List */}
                <div className={`flex flex-col border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 ${
                    mobileShowDetail ? 'hidden lg:flex lg:w-80 xl:w-96' : 'flex w-full lg:w-80 xl:w-96'
                }`}>
                    {/* List */}
                    <div className="flex-1 overflow-y-auto">
                        {loadingPrescriptions && prescriptions.length === 0 ? (
                            <div className="flex items-center justify-center h-48">
                                <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
                            </div>
                        ) : prescriptions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-3 p-6 text-center">
                                <div className="h-16 w-16 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                                    <ClipboardList className="h-8 w-8 text-orange-400" />
                                </div>
                                <p className="font-semibold text-gray-700 dark:text-gray-300">No prescriptions to fulfill</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">
                                    When a doctor, clinic, or hospital sends a supported prescription linked to a pharmacy order, it will appear here.
                                </p>
                            </div>
                        ) : (
                            <>
                                {prescriptions.map((p: any) => (
                                    <PrescriptionCard
                                        key={p.id}
                                        prescription={p}
                                        isSelected={selectedId === p.id}
                                        onClick={() => handleSelectPrescription(p.id)}
                                    />
                                ))}
                                {loadingPrescriptions && (
                                    <div className="flex justify-center py-4">
                                        <Loader2 className="h-5 w-5 animate-spin text-orange-400" />
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Pagination */}
                    {prescriptionsPagination.totalPages > 1 && (
                        <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                                Previous
                            </button>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {page} / {prescriptionsPagination.totalPages}
                            </span>
                            <button
                                onClick={() => setPage((p) => Math.min(prescriptionsPagination.totalPages, p + 1))}
                                disabled={page >= prescriptionsPagination.totalPages}
                                className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>

                {/* Right — Detail Panel */}
                <div className={`flex-1 bg-white dark:bg-gray-900 ${
                    mobileShowDetail ? 'flex flex-col' : 'hidden lg:flex flex-col'
                }`}>
                    {selectedId ? (
                        <PrescriptionDetailPanel
                            key={selectedId}
                            prescriptionId={selectedId}
                            onClose={handleCloseDetail}
                            onDispenseSuccess={handleDispenseSuccess}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
                            <div className="h-20 w-20 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                                <Eye className="h-10 w-10 text-orange-300" />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-700 dark:text-gray-300">Select a prescription</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Click any prescription on the left to view details, check inventory, and fulfill.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
