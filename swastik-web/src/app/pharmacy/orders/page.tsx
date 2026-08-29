'use client';

import { useCallback, useDeferredValue, useEffect, useState } from 'react';
import {
    ShoppingCart, Search, Loader2, RefreshCw, CheckCircle, XCircle,
    AlertCircle, Package, Bell, MapPin, IndianRupee, ChevronDown, ChevronUp, Send, FileText,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Pagination } from '@/components/ui/Pagination';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import { useOrderUpdates } from '@/hooks/useSocket';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';
import { AssignAgentModal } from '@/components/shared/AssignAgentModal';
import { AgentTrackingMap } from '@/components/shared/AgentTrackingMap';

const PAGE_SIZE = 10;

export default function PharmacyOrdersPage() {
    const { orders, ordersPagination, orderSummary, loadingOrders, error, fetchOrders, updateOrderStatus, clearError } = usePharmacyStore();
    const [searchQuery, setSearchQuery] = useState('');
    const deferredSearchQuery = useDeferredValue(searchQuery.trim());
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [tab, setTab] = useState<'all' | 'pending' | 'active' | 'completed'>('all');
    const [sourceFilter, setSourceFilter] = useState<'all' | 'patient' | 'prescription' | 'clinic' | 'hospital' | 'pos'>('all');
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
    const [newOrderAlert, setNewOrderAlert] = useState(false);
    const [page, setPage] = useState(1);
    const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);
    const { dialogProps, confirm: confirmAction } = useConfirmDialog();

    const loadOrders = useCallback(() => {
        void fetchOrders({
            page,
            limit: PAGE_SIZE,
            search: deferredSearchQuery || undefined,
            status: tab === 'pending' ? 'pending' : undefined,
            group: tab === 'active' || tab === 'completed' ? tab : undefined,
        });
    }, [deferredSearchQuery, fetchOrders, page, tab]);

    useOrderUpdates(
        useCallback(() => {
            loadOrders();
        }, [loadOrders]),
        useCallback(() => {
            setNewOrderAlert(true);
            loadOrders();
            setTimeout(() => setNewOrderAlert(false), 5000);
        }, [loadOrders])
    );

    useEffect(() => {
        loadOrders();
    }, [loadOrders]);

    useEffect(() => {
        setPage(1);
    }, [deferredSearchQuery, tab, sourceFilter]);

    const handleStatus = async (orderId: string, status: string) => {
        if (status === 'cancelled') {
            const confirmed = await confirmAction({
                title: 'Cancel Order',
                message: 'Cancel this order?',
                confirmLabel: 'Cancel Order',
                variant: 'danger',
            });
            if (!confirmed) return;
        }

        setActionLoading(orderId);
        await updateOrderStatus(orderId, status);
        setActionLoading(null);
    };

    const filteredOrders = orders.filter((order: any) => {
        if (sourceFilter === 'all') return true;
        
        const isClinic = !!order.clinic_id;
        const isHospital = !!order.hospital_id;
        const isPrescription = !!(order.prescription_id || order.prescription_url || order.prescription);
        const isPos = order.source === 'pos';
        
        if (sourceFilter === 'clinic') return isClinic;
        if (sourceFilter === 'hospital') return isHospital;
        if (sourceFilter === 'pos') return isPos;
        if (sourceFilter === 'patient') return !isPrescription && !isClinic && !isHospital && !isPos;
        if (sourceFilter === 'prescription') return isPrescription && !isClinic && !isHospital && !isPos;
        
        return true;
    });

    if (loadingOrders && orders.length === 0) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">Loading orders...</span>
            </div>
        );
    }

    if (error && orders.length === 0) {
        return (
            <div className="flex h-96 flex-col items-center justify-center gap-4">
                <AlertCircle className="h-12 w-12 text-red-400" />
                <p className="text-red-600">Unable to load orders.</p>
                <Button onClick={() => { clearError(); loadOrders(); }} leftIcon={<RefreshCw className="h-4 w-4" />}>Retry</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Orders</h1>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">Manage and fulfill pharmacy orders across your connected care channels.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={loadOrders} variant="outline" leftIcon={<RefreshCw className="h-4 w-4" />}>Refresh</Button>
                </div>
            </div>

            {newOrderAlert ? (
                <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-700 animate-pulse">
                    <Bell className="h-5 w-5 text-green-600" />
                    <span className="font-medium">New order received.</span>
                    <button onClick={() => { setNewOrderAlert(false); setTab('pending'); }} className="ml-auto text-sm underline">View pending</button>
                </div>
            ) : null}

            {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Card padding="md"><div className="flex items-center gap-3"><div className="rounded-xl bg-orange-100 dark:bg-orange-950/40 p-2.5"><ShoppingCart className="h-5 w-5 text-orange-600 dark:text-orange-400" /></div><div><p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{orderSummary.total}</p><p className="text-xs text-gray-500 dark:text-gray-400">Total Orders</p></div></div></Card>
                <Card padding="md"><div className="flex items-center gap-3"><div className="rounded-xl bg-yellow-100 dark:bg-yellow-950/40 p-2.5"><ShoppingCart className="h-5 w-5 text-yellow-600 dark:text-yellow-400" /></div><div><p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{orderSummary.pending}</p><p className="text-xs text-gray-500 dark:text-gray-400">Pending</p></div></div></Card>
                <Card padding="md"><div className="flex items-center gap-3"><div className="rounded-xl bg-blue-100 dark:bg-blue-950/40 p-2.5"><Package className="h-5 w-5 text-blue-600 dark:text-blue-400" /></div><div><p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{orderSummary.active}</p><p className="text-xs text-gray-500 dark:text-gray-400">Active</p></div></div></Card>
                <Card padding="md"><div className="flex items-center gap-3"><div className="rounded-xl bg-green-100 dark:bg-green-950/40 p-2.5"><CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" /></div><div><p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{orderSummary.completed}</p><p className="text-xs text-gray-500 dark:text-gray-400">Completed</p></div></div></Card>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
                <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
                    {([
                        { key: 'all' as const, label: 'All Status' },
                        { key: 'pending' as const, label: 'Pending' },
                        { key: 'active' as const, label: 'Active' },
                        { key: 'completed' as const, label: 'Completed' },
                    ]).map((currentTab) => (
                        <button
                            key={currentTab.key}
                            onClick={() => setTab(currentTab.key)}
                            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                                tab === currentTab.key
                                    ? 'bg-white text-gray-900 shadow dark:bg-gray-900 dark:text-gray-100'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                            {currentTab.label}
                        </button>
                    ))}
                </div>
                
                <select
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value as any)}
                    className="h-9 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                >
                    <option value="all">All Sources</option>
                    <option value="patient">Patient Orders</option>
                    <option value="prescription">Prescription Orders</option>
                    <option value="clinic">Partner Clinic</option>
                    <option value="hospital">Partner Hospital</option>
                    <option value="pos">POS / Walk-in</option>
                </select>

                <div className="flex-1 min-w-[200px]">
                    <Input
                        placeholder="Search by patient, order ID, address..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        leftIcon={<Search className="h-5 w-5" />}
                    />
                </div>
            </div>

            <div className="space-y-3">
                {filteredOrders.length === 0 ? (
                    <Card padding="lg">
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            <ShoppingCart className="mx-auto mb-2 h-10 w-10 text-gray-300 dark:text-gray-600" />
                            <p className="font-medium text-gray-900 dark:text-gray-100">No orders found</p>
                            <p className="mt-1 text-sm">Try changing your filters or search terms.</p>
                        </div>
                    </Card>
                ) : filteredOrders.map((order: any) => {
                    const isExpanded = expandedOrderId === order.id;
                    const items = order.items || [];
                    const patientName = order.patient?.name || order.patientName || 'Patient';
                    const patientPhone = order.patient?.user?.phone || 'No phone';
                    const total = order.total_amount || order.total || items.reduce((sum: number, item: any) => sum + (item.subtotal || (item.price || 0) * (item.quantity || 1)), 0);
                    const createdAt = order.created_at || order.time;
                    
                    const isClinic = !!order.clinic_id;
                    const isHospital = !!order.hospital_id;
                    const isPrescription = !!(order.prescription_id || order.prescription_url || order.prescription);
                    const isPos = order.source === 'pos';
                    
                    let sourceBadgeLabel = 'PATIENT ORDER';
                    let sourceBadgeClass = 'bg-purple-50 text-purple-700 ring-purple-700/10 dark:bg-purple-900/30 dark:text-purple-400 dark:ring-purple-400/20';
                    
                    if (isPos) {
                        sourceBadgeLabel = 'POS WALK-IN';
                        sourceBadgeClass = 'bg-orange-50 text-orange-700 ring-orange-700/10 dark:bg-orange-900/30 dark:text-orange-400 dark:ring-orange-400/20';
                    } else if (isClinic) {
                        sourceBadgeLabel = 'PARTNER CLINIC';
                        sourceBadgeClass = 'bg-teal-50 text-teal-700 ring-teal-700/10 dark:bg-teal-900/30 dark:text-teal-400 dark:ring-teal-400/20';
                    } else if (isHospital) {
                        sourceBadgeLabel = 'PARTNER HOSPITAL';
                        sourceBadgeClass = 'bg-indigo-50 text-indigo-700 ring-indigo-700/10 dark:bg-indigo-900/30 dark:text-indigo-400 dark:ring-indigo-400/20';
                    } else if (isPrescription) {
                        sourceBadgeLabel = 'PRESCRIPTION ORDER';
                        sourceBadgeClass = 'bg-blue-50 text-blue-700 ring-blue-700/10 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-400/20';
                    }

                    return (
                        <Card key={order.id} padding="none">
                            <div className="flex cursor-pointer items-start justify-between gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50" onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}>
                                <div className="flex min-w-0 items-start gap-4">
                                    <div className="min-w-0">
                                        <div className="mb-2 flex items-center gap-2">
                                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ring-1 ring-inset ${sourceBadgeClass}`}>
                                                {sourceBadgeLabel}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-gray-900 dark:text-gray-100">#{order.id?.slice(-6).toUpperCase()}</p>
                                        </div>
                                        <div className="mt-1 flex flex-col gap-0.5">
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{isPos ? 'Customer: Walk-in' : `Patient: ${patientName}`}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{items.length} medicine{items.length !== 1 ? 's' : ''}</p>
                                            <p className="text-xs text-gray-400">
                                                Received {createdAt ? new Date(createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-3 flex-shrink-0">
                                    <div className="flex flex-col items-end gap-1">
                                        <StatusBadge status={order.status || 'pending'} size="sm" />
                                        {order.status === 'pending' && <p className="text-xs font-medium text-orange-600 dark:text-orange-400">Stock Reserved</p>}
                                    </div>
                                    {total > 0 ? <div className="font-bold text-gray-900 dark:text-gray-100">₹{Number(total).toFixed(0)}</div> : null}
                                    
                                    {['pending', 'confirmed', 'processing', 'ready', 'dispatched', 'out_for_delivery'].includes(order.status) ? (
                                        <div className="flex gap-2 mt-2" onClick={(event) => event.stopPropagation()}>
                                            {order.status === 'pending' ? (
                                                <>
                                                    <Button size="sm" variant="outline" onClick={() => void handleStatus(order.id, 'cancelled')} disabled={actionLoading === order.id} className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/30">
                                                        Reject
                                                    </Button>
                                                    <Button size="sm" onClick={() => void handleStatus(order.id, 'confirmed')} disabled={actionLoading === order.id} className="h-8 bg-blue-600 hover:bg-blue-700 text-white">
                                                        {actionLoading === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Accept'}
                                                    </Button>
                                                </>
                                            ) : null}
                                            {order.status === 'confirmed' ? (
                                                <Button size="sm" onClick={() => void handleStatus(order.id, 'processing')} disabled={actionLoading === order.id} className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white">
                                                    Start Processing
                                                </Button>
                                            ) : null}
                                            {order.status === 'processing' ? (
                                                <Button size="sm" onClick={() => void handleStatus(order.id, 'ready')} disabled={actionLoading === order.id} className="h-8 bg-orange-600 hover:bg-orange-700 text-white">
                                                    Mark Ready
                                                </Button>
                                            ) : null}
                                            {order.status === 'ready' ? (
                                                <Button size="sm" onClick={() => setAssigningOrderId(order.id)} className="h-8 bg-purple-600 hover:bg-purple-700 text-white">
                                                    Dispatch
                                                </Button>
                                            ) : null}
                                            {order.status === 'dispatched' || order.status === 'out_for_delivery' ? (
                                                <Button size="sm" onClick={() => void handleStatus(order.id, 'delivered')} disabled={actionLoading === order.id} className="h-8 bg-green-600 hover:bg-green-700 text-white">
                                                    Complete
                                                </Button>
                                            ) : null}
                                        </div>
                                    ) : null}
                                    <div className="mt-1">
                                        {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                                    </div>
                                </div>
                            </div>

                            {isExpanded ? (
                                <div className="space-y-4 border-t border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                                    <div>
                                        <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Order Items</h4>
                                        {items.length > 0 ? (
                                            <div className="space-y-2">
                                                {items.map((item: any, index: number) => {
                                                    // Display real-time availability if populated
                                                    let stockStatus = null;
                                                    if (item.available_quantity !== undefined && item.minimum_stock !== undefined) {
                                                        if (item.available_quantity < item.quantity) {
                                                            stockStatus = <span className="text-xs font-medium text-red-600">Low Stock</span>;
                                                        } else {
                                                            stockStatus = <span className="text-xs font-medium text-green-600">Available</span>;
                                                        }
                                                    }

                                                    return (
                                                        <div key={index} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.name || item.medicineName || 'Medicine'}</p>
                                                                    {stockStatus}
                                                                </div>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400">Qty: {item.quantity || 1}</p>
                                                            </div>
                                                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">₹{item.subtotal || ((item.price || 0) * (item.quantity || 1))}</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="rounded-lg border border-yellow-100 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-900/50 dark:bg-yellow-900/20 dark:text-yellow-200">
                                                <p className="font-medium">Prescription-only Order</p>
                                                <p className="mt-1 text-xs">This order requires manual review of the prescription to determine items and total cost.</p>
                                            </div>
                                        )}
                                        {isPrescription && (
                                            <div className="mt-3">
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Prescription Reference</p>
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                            {order.prescription?.prescription_number || order.prescription_id?.slice(-6).toUpperCase() || 'RX-ATTACHED'}
                                                        </span>
                                                        {order.prescription_url && (
                                                            <a href={order.prescription_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50">
                                                                <FileText className="h-3 w-3" /> View Prescription
                                                            </a>
                                                        )}
                                                    </div>
                                                    {isClinic && order.clinic && (
                                                        <div className="mt-1 flex items-center gap-2">
                                                            <span className="inline-flex items-center rounded-md bg-teal-50 px-2 py-1 text-xs font-medium text-teal-700 ring-1 ring-inset ring-teal-700/10 dark:bg-teal-900/30 dark:text-teal-400 dark:ring-teal-400/20">
                                                                Routed by: {order.clinic.name}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {isHospital && order.hospital && (
                                                        <div className="mt-1 flex items-center gap-2">
                                                            <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10 dark:bg-indigo-900/30 dark:text-indigo-400 dark:ring-indigo-400/20">
                                                                Routed by: {order.hospital.name}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {order.delivery_address ? (
                                        <div className="flex items-start gap-2">
                                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Delivery Address</p>
                                                <p className="text-sm text-gray-700 dark:text-gray-300">{order.delivery_address}</p>
                                            </div>
                                        </div>
                                    ) : null}
                                    <div className="flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-700">
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Amount</span>
                                        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">₹{total > 0 ? Number(total).toFixed(2) : '—'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">Payment:</span>
                                        <StatusBadge status={order.payment_status || 'pending'} size="sm" />
                                    </div>
                                    
                                    {order.tracking_token && ['dispatched', 'out_for_delivery'].includes(order.status) && (
                                        <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                                            <h4 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Live Agent Tracking</h4>
                                            <AgentTrackingMap 
                                                trackingToken={order.tracking_token} 
                                                height="200px"
                                                facilityLocation={order.facility?.latitude && order.facility?.longitude ? {
                                                    lat: order.facility.latitude,
                                                    lng: order.facility.longitude,
                                                    name: order.facility.name || 'Pharmacy'
                                                } : null}
                                            />
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </Card>
                    );
                })}
            </div>

            <Pagination
                currentPage={ordersPagination.page}
                totalPages={ordersPagination.totalPages}
                onPageChange={setPage}
                totalItems={ordersPagination.total}
                itemsPerPage={PAGE_SIZE}
            />
            <ConfirmDialog {...dialogProps} />
            <AssignAgentModal
                isOpen={!!assigningOrderId}
                onClose={() => setAssigningOrderId(null)}
                orderId={assigningOrderId!}
                orderType="pharmacy"
                facilityId={orders.find((order) => order.id === assigningOrderId)?.pharmacy_id || orders.find((order) => order.id === assigningOrderId)?.facility?.id || null}
                facilityType="pharmacy"
                onAssigned={() => {
                    loadOrders();
                }}
            />
        </div>
    );
}
