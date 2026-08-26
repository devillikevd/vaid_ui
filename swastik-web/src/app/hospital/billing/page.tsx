'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Pagination } from '@/components/ui/Pagination';
import { hospitalApi } from '@/lib/api';
import {
    IndianRupee,
    Plus,
    ShieldCheck,
    FileText,
    Download,
    TrendingUp,
    CheckCircle2,
    Clock,
    RefreshCw,
    CreditCard,
    DollarSign,
    Layers,
    FileSpreadsheet
} from 'lucide-react';

/* eslint-disable @typescript-eslint/no-explicit-any */

type BillingTab = 'invoices' | 'deposits' | 'claims' | 'preauth' | 'revenue';

export default function BillingPage() {
    const [tab, setTab] = useState<BillingTab>('invoices');
    const [loading, setLoading] = useState(true);

    // ── Invoices & Charges State ──
    const [charges, setCharges] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [chargesPagination, setChargesPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [showAggregateModal, setShowAggregateModal] = useState(false);
    const [aggregateForm, setAggregateForm] = useState({ encounterId: '', admissionId: '' });
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [invoiceForm, setInvoiceForm] = useState({ patientId: '', encounterId: '', admissionId: '', discountAmount: '0' });
    const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
    const [paymentForm, setPaymentForm] = useState({ amount: '', paymentMode: 'upi', paymentRef: '' });

    // ── Deposits State ──
    const [deposits, setDeposits] = useState<any[]>([]);
    const [depPagination, setDepPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [showDepForm, setShowDepForm] = useState(false);
    const [depForm, setDepForm] = useState({ patientId: '', amount: '', paymentMode: 'cash', notes: '' });

    // ── TPA Claims State ──
    const [claims, setClaims] = useState<any[]>([]);
    const [claimsPagination, setClaimsPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [showClaimForm, setShowClaimForm] = useState(false);
    const [claimForm, setClaimForm] = useState({
        patientId: '',
        insuranceProvider: '',
        policyNumber: '',
        claimAmount: '',
        diagnosis: '',
        procedureName: '',
        tpaName: '',
        memberId: ''
    });
    const [selectedClaim, setSelectedClaim] = useState<any | null>(null);
    const [claimUpdateForm, setClaimUpdateForm] = useState({
        status: 'approved',
        approvedAmount: '',
        settledAmount: '',
        tdsAmount: '0',
        utrNumber: '',
        rejectionReason: ''
    });

    // ── Pre-Auth State ──
    const [preauths, setPreauths] = useState<any[]>([]);
    const [paPagination, setPaPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [showPaForm, setShowPaForm] = useState(false);
    const [paForm, setPaForm] = useState({ patientId: '', insuranceProvider: '', policyNumber: '', requestedAmount: '', diagnosis: '' });

    // ── Revenue & Tally State ──
    const [revenueDates, setRevenueDates] = useState({
        fromDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0]
    });
    const [revenueData, setRevenueData] = useState<any[]>([]);
    const [revenueTotals, setRevenueTotals] = useState<any>({
        totalInvoices: 0,
        grossRevenue: 0,
        netRevenue: 0,
        totalCollected: 0,
        totalOutstanding: 0,
        insuranceBilled: 0,
        discountGiven: 0
    });
    const [tallyExports, setTallyExports] = useState<any[]>([]);
    const [exportingTally, setExportingTally] = useState(false);

    // ═══════════════════════════════════════════════
    // FETCH DATA
    // ═══════════════════════════════════════════════

    const fetchChargesAndInvoices = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const res = await hospitalApi.getCharges({ page, limit: 20 });
            if (res.success) {
                const d = (res.data ?? res) as any;
                setCharges(d.data || []);
                setChargesPagination({ page, totalPages: Math.ceil((d.total || 0) / 20), total: d.total || 0 });
            }
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchDeposits = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const res = await hospitalApi.getDeposits({ page, limit: 20 });
            if (res.success) {
                const d = (res.data ?? res) as any;
                setDeposits(d.data || []);
                setDepPagination(d.pagination || { page: 1, totalPages: 1, total: 0 });
            }
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchClaims = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const res = await hospitalApi.getTpaClaims({ page, limit: 20 });
            if (res.success) {
                const d = (res.data ?? res) as any;
                setClaims(d.data || []);
                setClaimsPagination({ page, totalPages: Math.ceil((d.total || 0) / 20), total: d.total || 0 });
            }
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchPreauths = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const res = await hospitalApi.getPreauths({ page, limit: 20 });
            if (res.success) {
                const d = (res.data ?? res) as any;
                setPreauths(d.data || []);
                setPaPagination(d.pagination || { page: 1, totalPages: 1, total: 0 });
            }
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchRevenueAndTally = useCallback(async () => {
        setLoading(true);
        try {
            const [revRes, tallyRes] = await Promise.all([
                hospitalApi.getRevenueReport({ fromDate: revenueDates.fromDate, toDate: revenueDates.toDate }),
                hospitalApi.getTallyExports()
            ]);
            if (revRes.success) {
                const d = (revRes.data ?? revRes) as any;
                setRevenueData(d.data || []);
                if (d.totals) setRevenueTotals(d.totals);
            }
            if (tallyRes.success) {
                const d = (tallyRes.data ?? tallyRes) as any;
                setTallyExports(d.data || []);
            }
        } finally {
            setLoading(false);
        }
    }, [revenueDates]);

    useEffect(() => {
        if (tab === 'invoices') fetchChargesAndInvoices();
        else if (tab === 'deposits') fetchDeposits();
        else if (tab === 'claims') fetchClaims();
        else if (tab === 'preauth') fetchPreauths();
        else if (tab === 'revenue') fetchRevenueAndTally();
    }, [tab, fetchChargesAndInvoices, fetchDeposits, fetchClaims, fetchPreauths, fetchRevenueAndTally]);

    // ═══════════════════════════════════════════════
    // HANDLERS
    // ═══════════════════════════════════════════════

    const handleAggregate = async () => {
        if (!aggregateForm.encounterId && !aggregateForm.admissionId) return;
        const res = await hospitalApi.aggregateCharges({
            encounterId: aggregateForm.encounterId || undefined,
            admissionId: aggregateForm.admissionId || undefined
        });
        if (res.success) {
            setShowAggregateModal(false);
            setAggregateForm({ encounterId: '', admissionId: '' });
            fetchChargesAndInvoices();
        }
    };

    const handleGenerateInvoice = async () => {
        if (!invoiceForm.patientId && !invoiceForm.encounterId && !invoiceForm.admissionId) return;
        const res = await hospitalApi.generateInvoice({
            patientId: invoiceForm.patientId || undefined,
            encounterId: invoiceForm.encounterId || undefined,
            admissionId: invoiceForm.admissionId || undefined,
            discountAmount: parseFloat(invoiceForm.discountAmount) || 0
        });
        if (res.success) {
            setShowInvoiceModal(false);
            setInvoiceForm({ patientId: '', encounterId: '', admissionId: '', discountAmount: '0' });
            fetchChargesAndInvoices();
        }
    };

    const handleDeposit = async () => {
        if (!depForm.patientId || !depForm.amount) return;
        const res = await hospitalApi.createDeposit({ ...depForm, amount: parseFloat(depForm.amount) });
        if (res.success) {
            setShowDepForm(false);
            setDepForm({ patientId: '', amount: '', paymentMode: 'cash', notes: '' });
            fetchDeposits();
        }
    };

    const handleCreateClaim = async () => {
        if (!claimForm.patientId || !claimForm.insuranceProvider || !claimForm.policyNumber || !claimForm.claimAmount) return;
        const res = await hospitalApi.createTpaClaim({
            ...claimForm,
            claimAmount: parseFloat(claimForm.claimAmount)
        });
        if (res.success) {
            setShowClaimForm(false);
            setClaimForm({
                patientId: '',
                insuranceProvider: '',
                policyNumber: '',
                claimAmount: '',
                diagnosis: '',
                procedureName: '',
                tpaName: '',
                memberId: ''
            });
            fetchClaims();
        }
    };

    const handleUpdateClaim = async () => {
        if (!selectedClaim) return;
        const payload: Record<string, any> = { status: claimUpdateForm.status };
        if (claimUpdateForm.approvedAmount) payload.approved_amount = parseFloat(claimUpdateForm.approvedAmount);
        if (claimUpdateForm.settledAmount) payload.settled_amount = parseFloat(claimUpdateForm.settledAmount);
        if (claimUpdateForm.tdsAmount) payload.tds_amount = parseFloat(claimUpdateForm.tdsAmount);
        if (claimUpdateForm.utrNumber) payload.utr_number = claimUpdateForm.utrNumber;
        if (claimUpdateForm.rejectionReason) payload.rejection_reason = claimUpdateForm.rejectionReason;

        const res = await hospitalApi.updateTpaClaim(selectedClaim.id, payload);
        if (res.success) {
            setSelectedClaim(null);
            fetchClaims();
        }
    };

    const handlePreauth = async () => {
        if (!paForm.patientId || !paForm.insuranceProvider || !paForm.policyNumber) return;
        const res = await hospitalApi.createPreauth({
            ...paForm,
            requestedAmount: paForm.requestedAmount ? parseFloat(paForm.requestedAmount) : null
        });
        if (res.success) {
            setShowPaForm(false);
            setPaForm({ patientId: '', insuranceProvider: '', policyNumber: '', requestedAmount: '', diagnosis: '' });
            fetchPreauths();
        }
    };

    const handleExportTally = async () => {
        setExportingTally(true);
        try {
            const res = await hospitalApi.exportTally({
                fromDate: revenueDates.fromDate,
                toDate: revenueDates.toDate,
                type: 'sales'
            });
            if (res.success) {
                const d = (res.data ?? res) as any;
                if (d.xml) {
                    const blob = new Blob([d.xml], { type: 'application/xml' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Tally_Sales_${revenueDates.fromDate}_to_${revenueDates.toDate}.xml`;
                    a.click();
                    URL.revokeObjectURL(url);
                }
                fetchRevenueAndTally();
            }
        } finally {
            setExportingTally(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-green-700 rounded-2xl p-6 text-white shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <IndianRupee className="h-6 w-6" /> Billing & Revenue Command Center
                        </h1>
                        <p className="text-emerald-100 text-sm mt-1">
                            Encounter charge aggregation, invoicing, TPA claims, daily revenue & Tally export
                        </p>
                    </div>
                    {tab === 'revenue' && (
                        <Button
                            onClick={handleExportTally}
                            disabled={exportingTally}
                            className="bg-white text-emerald-800 hover:bg-emerald-50 font-semibold shadow"
                        >
                            {exportingTally ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                            Export to Tally XML
                        </Button>
                    )}
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 border-b overflow-x-auto pb-1">
                {[
                    { key: 'invoices', label: 'Invoices & Charges', icon: FileText },
                    { key: 'deposits', label: 'Deposits & Advances', icon: IndianRupee },
                    { key: 'claims', label: 'TPA & Insurance Claims', icon: ShieldCheck },
                    { key: 'preauth', label: 'Insurance Pre-Auth', icon: CheckCircle2 },
                    { key: 'revenue', label: 'Revenue & Tally Export', icon: TrendingUp }
                ].map(t => {
                    const Icon = t.icon;
                    return (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key as BillingTab)}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                                tab === t.key
                                    ? 'border-emerald-600 text-emerald-700 font-semibold'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <Icon className="h-4 w-4" />
                            {t.label}
                        </button>
                    );
                })}
            </div>

            {/* ═══════════════════════════════════════════════
                TAB 1: INVOICES & CHARGES
               ═══════════════════════════════════════════════ */}
            {tab === 'invoices' && (
                <div className="space-y-4">
                    <div className="flex flex-wrap justify-between items-center gap-3">
                        <div className="text-sm text-gray-500">
                            Showing encounter line item charges from Lab, Radiology, OT, and Room wards.
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                                onClick={() => setShowAggregateModal(true)}
                            >
                                <RefreshCw className="h-4 w-4 mr-2" /> Auto-Aggregate Charges
                            </Button>
                            <Button
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => setShowInvoiceModal(true)}
                            >
                                <Plus className="h-4 w-4 mr-2" /> Generate Invoice
                            </Button>
                        </div>
                    </div>

                    {/* Aggregate Modal */}
                    {showAggregateModal && (
                        <Card className="border-emerald-200 bg-emerald-50/50">
                            <CardHeader>
                                <CardTitle className="text-sm text-emerald-900 flex items-center gap-2">
                                    <Layers className="h-4 w-4" /> Auto-Aggregate Unbilled Encounter Charges
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-xs text-gray-600">
                                    Pulls completed lab tests, radiology scans, OT surgeries, and ward daily room rent into encounter charges.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <input
                                        placeholder="Encounter ID (UUID)"
                                        className="border rounded-lg px-3 py-2 text-sm bg-white"
                                        value={aggregateForm.encounterId}
                                        onChange={e => setAggregateForm({ ...aggregateForm, encounterId: e.target.value })}
                                    />
                                    <input
                                        placeholder="Admission ID (UUID)"
                                        className="border rounded-lg px-3 py-2 text-sm bg-white"
                                        value={aggregateForm.admissionId}
                                        onChange={e => setAggregateForm({ ...aggregateForm, admissionId: e.target.value })}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={handleAggregate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                        Aggregate Now
                                    </Button>
                                    <Button variant="outline" onClick={() => setShowAggregateModal(false)}>Cancel</Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Generate Invoice Modal */}
                    {showInvoiceModal && (
                        <Card className="border-emerald-200 bg-emerald-50/50">
                            <CardHeader>
                                <CardTitle className="text-sm text-emerald-900 flex items-center gap-2">
                                    <FileText className="h-4 w-4" /> Generate Final Invoice
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <input
                                        placeholder="Patient ID (UUID)"
                                        className="border rounded-lg px-3 py-2 text-sm bg-white"
                                        value={invoiceForm.patientId}
                                        onChange={e => setInvoiceForm({ ...invoiceForm, patientId: e.target.value })}
                                    />
                                    <input
                                        placeholder="Encounter ID (optional)"
                                        className="border rounded-lg px-3 py-2 text-sm bg-white"
                                        value={invoiceForm.encounterId}
                                        onChange={e => setInvoiceForm({ ...invoiceForm, encounterId: e.target.value })}
                                    />
                                    <input
                                        placeholder="Discount Amount (₹)"
                                        type="number"
                                        className="border rounded-lg px-3 py-2 text-sm bg-white"
                                        value={invoiceForm.discountAmount}
                                        onChange={e => setInvoiceForm({ ...invoiceForm, discountAmount: e.target.value })}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={handleGenerateInvoice} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                        Create Draft Invoice
                                    </Button>
                                    <Button variant="outline" onClick={() => setShowInvoiceModal(false)}>Cancel</Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Charges Table */}
                    <Card>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="text-left px-4 py-3 text-gray-500 font-medium">Service / Item</th>
                                            <th className="text-left px-4 py-3 text-gray-500 font-medium">Category</th>
                                            <th className="text-right px-4 py-3 text-gray-500 font-medium">Qty</th>
                                            <th className="text-right px-4 py-3 text-gray-500 font-medium">Rate</th>
                                            <th className="text-right px-4 py-3 text-gray-500 font-medium">Net (₹)</th>
                                            <th className="text-left px-4 py-3 text-gray-500 font-medium">Source</th>
                                            <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                                            <th className="text-left px-4 py-3 text-gray-500 font-medium">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {charges.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                                                    {loading ? 'Loading charges...' : 'No encounter charges found. Click "Auto-Aggregate Charges" to pull from lab/rad/OT/wards.'}
                                                </td>
                                            </tr>
                                        ) : (
                                            charges.map((c: any) => (
                                                <tr key={c.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 font-medium text-gray-900">{c.service_name}</td>
                                                    <td className="px-4 py-3 capitalize text-xs">
                                                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                                                            {c.category || 'misc'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">{c.quantity || 1}</td>
                                                    <td className="px-4 py-3 text-right text-gray-600">₹{parseFloat(c.unit_rate || 0).toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                                                        ₹{parseFloat(c.net_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-500">{c.source_type || 'manual'}</td>
                                                    <td className="px-4 py-3">
                                                        <StatusBadge status={c.status} />
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-500">
                                                        {c.charge_date ? new Date(c.charge_date).toLocaleDateString() : '—'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                    {chargesPagination.totalPages > 1 && (
                        <Pagination
                            currentPage={chargesPagination.page}
                            totalPages={chargesPagination.totalPages}
                            onPageChange={p => fetchChargesAndInvoices(p)}
                        />
                    )}
                </div>
            )}

            {/* ═══════════════════════════════════════════════
                TAB 2: DEPOSITS & ADVANCES
               ═══════════════════════════════════════════════ */}
            {tab === 'deposits' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setShowDepForm(true)}>
                            <Plus className="h-4 w-4 mr-2" /> Collect Advance Deposit
                        </Button>
                    </div>

                    {showDepForm && (
                        <Card className="border-emerald-200">
                            <CardHeader><CardTitle className="text-sm">Collect Patient Deposit</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                    <input
                                        placeholder="Patient ID (UUID) *"
                                        className="border rounded-lg px-3 py-2 text-sm"
                                        value={depForm.patientId}
                                        onChange={e => setDepForm({ ...depForm, patientId: e.target.value })}
                                    />
                                    <input
                                        placeholder="Amount (₹) *"
                                        type="number"
                                        className="border rounded-lg px-3 py-2 text-sm"
                                        value={depForm.amount}
                                        onChange={e => setDepForm({ ...depForm, amount: e.target.value })}
                                    />
                                    <select
                                        className="border rounded-lg px-3 py-2 text-sm"
                                        value={depForm.paymentMode}
                                        onChange={e => setDepForm({ ...depForm, paymentMode: e.target.value })}
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="card">Card</option>
                                        <option value="upi">UPI</option>
                                        <option value="neft">NEFT / RTGS</option>
                                        <option value="cheque">Cheque</option>
                                    </select>
                                    <input
                                        placeholder="Notes"
                                        className="border rounded-lg px-3 py-2 text-sm"
                                        value={depForm.notes}
                                        onChange={e => setDepForm({ ...depForm, notes: e.target.value })}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={handleDeposit} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                        Collect & Print Receipt
                                    </Button>
                                    <Button variant="outline" onClick={() => setShowDepForm(false)}>Cancel</Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Receipt #</th>
                                            <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Patient</th>
                                            <th className="text-right px-4 py-2.5 text-gray-500 font-medium">Amount</th>
                                            <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Mode</th>
                                            <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Status</th>
                                            <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {deposits.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                                                    {loading ? 'Loading deposits...' : 'No deposits recorded yet.'}
                                                </td>
                                            </tr>
                                        ) : (
                                            deposits.map((d: any) => (
                                                <tr key={d.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{d.receipt_number || d.id?.slice(0, 8)}</td>
                                                    <td className="px-4 py-2.5 font-medium">{d.patient?.name || 'Patient'}</td>
                                                    <td className="px-4 py-2.5 text-right font-semibold text-green-700">
                                                        ₹{parseFloat(d.amount || 0).toLocaleString('en-IN')}
                                                    </td>
                                                    <td className="px-4 py-2.5 capitalize text-xs">{d.payment_mode}</td>
                                                    <td className="px-4 py-2.5"><StatusBadge status={d.status} /></td>
                                                    <td className="px-4 py-2.5 text-xs text-gray-500">
                                                        {d.created_at ? new Date(d.created_at).toLocaleDateString() : '—'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                    {depPagination.totalPages > 1 && (
                        <Pagination currentPage={depPagination.page} totalPages={depPagination.totalPages} onPageChange={p => fetchDeposits(p)} />
                    )}
                </div>
            )}

            {/* ═══════════════════════════════════════════════
                TAB 3: TPA & INSURANCE CLAIMS
               ═══════════════════════════════════════════════ */}
            {tab === 'claims' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-500">Track and settle cashless/reimbursement claims with TPAs and insurers.</p>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setShowClaimForm(true)}>
                            <Plus className="h-4 w-4 mr-2" /> New TPA Claim
                        </Button>
                    </div>

                    {showClaimForm && (
                        <Card className="border-emerald-200">
                            <CardHeader><CardTitle className="text-sm">Submit New TPA Claim</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <input
                                        placeholder="Patient ID (UUID) *"
                                        className="border rounded-lg px-3 py-2 text-sm"
                                        value={claimForm.patientId}
                                        onChange={e => setClaimForm({ ...claimForm, patientId: e.target.value })}
                                    />
                                    <input
                                        placeholder="Insurance Provider (e.g. Star Health) *"
                                        className="border rounded-lg px-3 py-2 text-sm"
                                        value={claimForm.insuranceProvider}
                                        onChange={e => setClaimForm({ ...claimForm, insuranceProvider: e.target.value })}
                                    />
                                    <input
                                        placeholder="Policy Number *"
                                        className="border rounded-lg px-3 py-2 text-sm"
                                        value={claimForm.policyNumber}
                                        onChange={e => setClaimForm({ ...claimForm, policyNumber: e.target.value })}
                                    />
                                    <input
                                        placeholder="TPA Name (e.g. Medi Assist)"
                                        className="border rounded-lg px-3 py-2 text-sm"
                                        value={claimForm.tpaName}
                                        onChange={e => setClaimForm({ ...claimForm, tpaName: e.target.value })}
                                    />
                                    <input
                                        placeholder="Member / Card ID"
                                        className="border rounded-lg px-3 py-2 text-sm"
                                        value={claimForm.memberId}
                                        onChange={e => setClaimForm({ ...claimForm, memberId: e.target.value })}
                                    />
                                    <input
                                        placeholder="Claim Amount (₹) *"
                                        type="number"
                                        className="border rounded-lg px-3 py-2 text-sm"
                                        value={claimForm.claimAmount}
                                        onChange={e => setClaimForm({ ...claimForm, claimAmount: e.target.value })}
                                    />
                                    <input
                                        placeholder="Diagnosis"
                                        className="border rounded-lg px-3 py-2 text-sm sm:col-span-2"
                                        value={claimForm.diagnosis}
                                        onChange={e => setClaimForm({ ...claimForm, diagnosis: e.target.value })}
                                    />
                                    <input
                                        placeholder="Procedure Name"
                                        className="border rounded-lg px-3 py-2 text-sm"
                                        value={claimForm.procedureName}
                                        onChange={e => setClaimForm({ ...claimForm, procedureName: e.target.value })}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={handleCreateClaim} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                        Submit Claim
                                    </Button>
                                    <Button variant="outline" onClick={() => setShowClaimForm(false)}>Cancel</Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Settle / Update Claim Modal */}
                    {selectedClaim && (
                        <Card className="border-blue-200 bg-blue-50/40">
                            <CardHeader>
                                <CardTitle className="text-sm text-blue-900">
                                    Update TPA Claim #{selectedClaim.claim_number || selectedClaim.id?.slice(0, 8)}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-xs text-gray-500 font-medium">Status</label>
                                        <select
                                            className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                                            value={claimUpdateForm.status}
                                            onChange={e => setClaimUpdateForm({ ...claimUpdateForm, status: e.target.value })}
                                        >
                                            <option value="submitted">Submitted</option>
                                            <option value="under_review">Under Review</option>
                                            <option value="query">Query Raised</option>
                                            <option value="approved">Approved</option>
                                            <option value="settled">Settled</option>
                                            <option value="rejected">Rejected</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 font-medium">Approved Amount (₹)</label>
                                        <input
                                            type="number"
                                            className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                                            value={claimUpdateForm.approvedAmount}
                                            onChange={e => setClaimUpdateForm({ ...claimUpdateForm, approvedAmount: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 font-medium">Settled Amount (₹)</label>
                                        <input
                                            type="number"
                                            className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                                            value={claimUpdateForm.settledAmount}
                                            onChange={e => setClaimUpdateForm({ ...claimUpdateForm, settledAmount: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 font-medium">TDS Deducted (₹)</label>
                                        <input
                                            type="number"
                                            className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                                            value={claimUpdateForm.tdsAmount}
                                            onChange={e => setClaimUpdateForm({ ...claimUpdateForm, tdsAmount: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 font-medium">Bank UTR / Ref #</label>
                                        <input
                                            className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                                            value={claimUpdateForm.utrNumber}
                                            onChange={e => setClaimUpdateForm({ ...claimUpdateForm, utrNumber: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 font-medium">Rejection / Query Reason</label>
                                        <input
                                            className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                                            value={claimUpdateForm.rejectionReason}
                                            onChange={e => setClaimUpdateForm({ ...claimUpdateForm, rejectionReason: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={handleUpdateClaim} className="bg-blue-600 hover:bg-blue-700 text-white">
                                        Save Updates
                                    </Button>
                                    <Button variant="outline" onClick={() => setSelectedClaim(null)}>Cancel</Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="text-left px-4 py-3 text-gray-500 font-medium">Claim #</th>
                                            <th className="text-left px-4 py-3 text-gray-500 font-medium">Patient</th>
                                            <th className="text-left px-4 py-3 text-gray-500 font-medium">Provider / TPA</th>
                                            <th className="text-right px-4 py-3 text-gray-500 font-medium">Claimed</th>
                                            <th className="text-right px-4 py-3 text-gray-500 font-medium">Approved</th>
                                            <th className="text-right px-4 py-3 text-gray-500 font-medium">Settled</th>
                                            <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                                            <th className="text-center px-4 py-3 text-gray-500 font-medium">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {claims.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                                                    {loading ? 'Loading claims...' : 'No TPA claims found.'}
                                                </td>
                                            </tr>
                                        ) : (
                                            claims.map((c: any) => (
                                                <tr key={c.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{c.claim_number || c.id?.slice(0, 8)}</td>
                                                    <td className="px-4 py-3 font-medium">{c.patient?.name || 'Patient'}</td>
                                                    <td className="px-4 py-3 text-xs">
                                                        <div className="font-semibold text-gray-800">{c.insurance_provider}</div>
                                                        <div className="text-gray-500">{c.tpa_name || c.policy_number}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium">₹{parseFloat(c.claim_amount || 0).toLocaleString('en-IN')}</td>
                                                    <td className="px-4 py-3 text-right text-blue-700 font-semibold">
                                                        {c.approved_amount ? `₹${parseFloat(c.approved_amount).toLocaleString('en-IN')}` : '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-emerald-700 font-semibold">
                                                        {c.settled_amount ? `₹${parseFloat(c.settled_amount).toLocaleString('en-IN')}` : '—'}
                                                    </td>
                                                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                                                    <td className="px-4 py-3 text-center">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-xs"
                                                            onClick={() => {
                                                                setSelectedClaim(c);
                                                                setClaimUpdateForm({
                                                                    status: c.status || 'approved',
                                                                    approvedAmount: c.approved_amount ? String(c.approved_amount) : '',
                                                                    settledAmount: c.settled_amount ? String(c.settled_amount) : '',
                                                                    tdsAmount: c.tds_amount ? String(c.tds_amount) : '0',
                                                                    utrNumber: c.utr_number || '',
                                                                    rejectionReason: c.rejection_reason || ''
                                                                });
                                                            }}
                                                        >
                                                            Update
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                    {claimsPagination.totalPages > 1 && (
                        <Pagination currentPage={claimsPagination.page} totalPages={claimsPagination.totalPages} onPageChange={p => fetchClaims(p)} />
                    )}
                </div>
            )}

            {/* ═══════════════════════════════════════════════
                TAB 4: INSURANCE PRE-AUTH
               ═══════════════════════════════════════════════ */}
            {tab === 'preauth' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowPaForm(true)}>
                            <Plus className="h-4 w-4 mr-2" /> New Pre-Auth Request
                        </Button>
                    </div>

                    {showPaForm && (
                        <Card className="border-blue-200">
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-blue-600" /> New Insurance Pre-Auth
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <input
                                        placeholder="Patient ID (UUID) *"
                                        className="border rounded-lg px-3 py-2 text-sm"
                                        value={paForm.patientId}
                                        onChange={e => setPaForm({ ...paForm, patientId: e.target.value })}
                                    />
                                    <input
                                        placeholder="Provider (e.g. Star Health) *"
                                        className="border rounded-lg px-3 py-2 text-sm"
                                        value={paForm.insuranceProvider}
                                        onChange={e => setPaForm({ ...paForm, insuranceProvider: e.target.value })}
                                    />
                                    <input
                                        placeholder="Policy Number *"
                                        className="border rounded-lg px-3 py-2 text-sm"
                                        value={paForm.policyNumber}
                                        onChange={e => setPaForm({ ...paForm, policyNumber: e.target.value })}
                                    />
                                    <input
                                        placeholder="Requested Amount (₹)"
                                        type="number"
                                        className="border rounded-lg px-3 py-2 text-sm"
                                        value={paForm.requestedAmount}
                                        onChange={e => setPaForm({ ...paForm, requestedAmount: e.target.value })}
                                    />
                                    <input
                                        placeholder="Diagnosis"
                                        className="border rounded-lg px-3 py-2 text-sm sm:col-span-2"
                                        value={paForm.diagnosis}
                                        onChange={e => setPaForm({ ...paForm, diagnosis: e.target.value })}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={handlePreauth} className="bg-blue-600 hover:bg-blue-700 text-white">Submit Request</Button>
                                    <Button variant="outline" onClick={() => setShowPaForm(false)}>Cancel</Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Pre-Auth #</th>
                                            <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Patient</th>
                                            <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Provider</th>
                                            <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Policy #</th>
                                            <th className="text-right px-4 py-2.5 text-gray-500 font-medium">Requested</th>
                                            <th className="text-right px-4 py-2.5 text-gray-500 font-medium">Approved</th>
                                            <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {preauths.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                                                    {loading ? 'Loading pre-auths...' : 'No pre-authorization requests'}
                                                </td>
                                            </tr>
                                        ) : (
                                            preauths.map((p: any) => (
                                                <tr key={p.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2.5 font-mono text-xs">{p.pre_auth_number || p.id?.slice(0, 8)}</td>
                                                    <td className="px-4 py-2.5">{p.patient?.name || 'Patient'}</td>
                                                    <td className="px-4 py-2.5 font-medium">{p.insurance_provider}</td>
                                                    <td className="px-4 py-2.5 text-xs text-gray-500">{p.policy_number}</td>
                                                    <td className="px-4 py-2.5 text-right font-medium">
                                                        {p.requested_amount ? `₹${parseFloat(p.requested_amount).toLocaleString('en-IN')}` : '—'}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right font-semibold text-green-700">
                                                        {p.approved_amount ? `₹${parseFloat(p.approved_amount).toLocaleString('en-IN')}` : '—'}
                                                    </td>
                                                    <td className="px-4 py-2.5"><StatusBadge status={p.status} /></td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                    {paPagination.totalPages > 1 && (
                        <Pagination currentPage={paPagination.page} totalPages={paPagination.totalPages} onPageChange={p => fetchPreauths(p)} />
                    )}
                </div>
            )}

            {/* ═══════════════════════════════════════════════
                TAB 5: REVENUE ANALYTICS & TALLY EXPORT
               ═══════════════════════════════════════════════ */}
            {tab === 'revenue' && (
                <div className="space-y-6">
                    {/* Date Filter & Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border">
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-600 font-medium">Period:</span>
                            <input
                                type="date"
                                className="border rounded-lg px-3 py-1.5 text-sm"
                                value={revenueDates.fromDate}
                                onChange={e => setRevenueDates({ ...revenueDates, fromDate: e.target.value })}
                            />
                            <span className="text-gray-400">to</span>
                            <input
                                type="date"
                                className="border rounded-lg px-3 py-1.5 text-sm"
                                value={revenueDates.toDate}
                                onChange={e => setRevenueDates({ ...revenueDates, toDate: e.target.value })}
                            />
                            <Button size="sm" variant="outline" onClick={() => fetchRevenueAndTally()}>
                                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Apply
                            </Button>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                    await hospitalApi.buildDailyRevenue({ date: revenueDates.toDate });
                                    fetchRevenueAndTally();
                                }}
                            >
                                Rebuild Today Summary
                            </Button>
                        </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <Card className="border-l-4 border-l-emerald-500">
                            <CardContent className="p-4">
                                <div className="text-xs text-gray-500 font-medium flex items-center gap-1">
                                    <DollarSign className="h-3.5 w-3.5 text-emerald-600" /> Gross Revenue
                                </div>
                                <div className="text-xl font-bold text-gray-900 mt-1">
                                    ₹{revenueTotals.grossRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">{revenueTotals.totalInvoices} invoices generated</div>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-teal-500">
                            <CardContent className="p-4">
                                <div className="text-xs text-gray-500 font-medium flex items-center gap-1">
                                    <CreditCard className="h-3.5 w-3.5 text-teal-600" /> Total Collections
                                </div>
                                <div className="text-xl font-bold text-teal-700 mt-1">
                                    ₹{revenueTotals.totalCollected.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </div>
                                <div className="text-xs text-teal-600 mt-1">Cash, UPI, Card, NEFT</div>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-orange-500">
                            <CardContent className="p-4">
                                <div className="text-xs text-gray-500 font-medium flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5 text-orange-600" /> Outstanding Receivables
                                </div>
                                <div className="text-xl font-bold text-orange-700 mt-1">
                                    ₹{revenueTotals.totalOutstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </div>
                                <div className="text-xs text-orange-600 mt-1">Pending from patients</div>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-blue-500">
                            <CardContent className="p-4">
                                <div className="text-xs text-gray-500 font-medium flex items-center gap-1">
                                    <ShieldCheck className="h-3.5 w-3.5 text-blue-600" /> Insurance Billed
                                </div>
                                <div className="text-xl font-bold text-blue-700 mt-1">
                                    ₹{revenueTotals.insuranceBilled.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </div>
                                <div className="text-xs text-blue-600 mt-1">Cashless & TPA claims</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Tally Export History */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Tally ERP 9 / TallyPrime XML Export Log
                            </CardTitle>
                            <span className="text-xs text-gray-500">Sales Voucher XML format</span>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Export ID</th>
                                            <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Type</th>
                                            <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Period</th>
                                            <th className="text-right px-4 py-2.5 text-gray-500 font-medium">Vouchers</th>
                                            <th className="text-right px-4 py-2.5 text-gray-500 font-medium">Total Amount</th>
                                            <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Status</th>
                                            <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {tallyExports.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                                                    No Tally exports generated yet. Click &quot;Export to Tally XML&quot; above to create one.
                                                </td>
                                            </tr>
                                        ) : (
                                            tallyExports.map((t: any) => (
                                                <tr key={t.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2.5 font-mono text-xs">{t.id?.slice(0, 8)}</td>
                                                    <td className="px-4 py-2.5 uppercase text-xs font-semibold">{t.export_type}</td>
                                                    <td className="px-4 py-2.5 text-xs text-gray-600">{t.period_from} → {t.period_to}</td>
                                                    <td className="px-4 py-2.5 text-right font-medium">{t.voucher_count}</td>
                                                    <td className="px-4 py-2.5 text-right font-semibold text-emerald-700">
                                                        ₹{parseFloat(t.total_amount || 0).toLocaleString('en-IN')}
                                                    </td>
                                                    <td className="px-4 py-2.5"><StatusBadge status={t.status} /></td>
                                                    <td className="px-4 py-2.5 text-xs text-gray-500">
                                                        {t.created_at ? new Date(t.created_at).toLocaleString() : '—'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
