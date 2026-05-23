'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    CheckCircle,
    ExternalLink,
    FileSearch,
    FileText,
    Loader2,
    RefreshCw,
    Shield,
    XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { adminApi } from '@/lib/api';

interface ComplianceDocumentIdentifier {
    key: string;
    label: string;
    value: string;
}

interface ComplianceDocument {
    id: string;
    provider_id: string;
    provider_name: string;
    provider_type: string;
    provider_type_label: string;
    provider_status: string;
    document_type: string;
    document_url?: string | null;
    identifiers: ComplianceDocumentIdentifier[];
    missing_items: string[];
    expiry_date?: string | null;
    days_until_expiry?: number | null;
    status: string;
    email?: string | null;
    phone?: string | null;
    contact_name?: string | null;
    approval_notes?: string | null;
    can_approve_provider?: boolean;
    provider_approval_block_reason?: string | null;
}

interface ComplianceSummary {
    total: number;
    missing: number;
    submitted: number;
    approved: number;
    rejected: number;
    suspended: number;
    expired: number;
    expiringSoon: number;
}

const PROVIDER_TYPES = [
    { value: 'all', label: 'All Providers' },
    { value: 'doctor', label: 'Doctors' },
    { value: 'hospital', label: 'Hospitals' },
    { value: 'clinic', label: 'Clinics' },
    { value: 'pharmacy', label: 'Pharmacies' },
    { value: 'diagnostic_center', label: 'Diagnostic Centers' },
    { value: 'ambulance', label: 'Ambulances' },
];

const STATUS_OPTIONS = [
    { value: 'all', label: 'All Statuses' },
    { value: 'missing', label: 'Missing' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'expired', label: 'Expired' },
    { value: 'expiring_soon', label: 'Expiring Soon' },
];

const statusPillClass = (status: string) => {
    switch (status) {
        case 'missing':
            return 'bg-red-100 text-red-700';
        case 'expired':
            return 'bg-red-100 text-red-700';
        case 'expiring_soon':
            return 'bg-amber-100 text-amber-700';
        case 'submitted':
        case 'under_review':
            return 'bg-blue-100 text-blue-700';
        case 'approved':
            return 'bg-green-100 text-green-700';
        case 'rejected':
            return 'bg-rose-100 text-rose-700';
        case 'suspended':
            return 'bg-slate-200 text-slate-700';
        default:
            return 'bg-gray-100 text-gray-700';
    }
};

const formatStatus = (status: string) =>
    status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

export default function CompliancePage() {
    const [documents, setDocuments] = useState<ComplianceDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [days, setDays] = useState(30);
    const [providerType, setProviderType] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [coverageNote, setCoverageNote] = useState<string | null>(null);
    const [summary, setSummary] = useState<ComplianceSummary>({
        total: 0,
        missing: 0,
        submitted: 0,
        approved: 0,
        rejected: 0,
        suspended: 0,
        expired: 0,
        expiringSoon: 0,
    });
    const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
    const [actingId, setActingId] = useState<string | null>(null);
    const [rejectTarget, setRejectTarget] = useState<ComplianceDocument | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    const fetchCompliance = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await adminApi.getComplianceDocuments({
                days,
                type: providerType,
                status: statusFilter,
                search: searchQuery,
                page,
                limit: 12,
            });

            if (!response.success) {
                throw new Error(response.error || 'Failed to load compliance data');
            }

            setDocuments(Array.isArray(response.data) ? response.data as ComplianceDocument[] : []);
            setCoverageNote((response.coverage as { note?: string } | undefined)?.note || null);
            setSummary((response.summary as ComplianceSummary | undefined) || {
                total: 0,
                missing: 0,
                submitted: 0,
                approved: 0,
                rejected: 0,
                suspended: 0,
                expired: 0,
                expiringSoon: 0,
            });
            setPagination((response.pagination as typeof pagination | undefined) || {
                page: 1,
                limit: 12,
                total: 0,
                totalPages: 1,
            });
        } catch (fetchError) {
            console.error('Error fetching compliance data:', fetchError);
            setError(fetchError instanceof Error ? fetchError.message : 'Failed to load compliance data');
            setDocuments([]);
        } finally {
            setIsLoading(false);
        }
    }, [days, page, providerType, searchQuery, statusFilter]);

    useEffect(() => {
        fetchCompliance();
    }, [fetchCompliance]);

    const summaryCards = useMemo(() => ([
        {
            label: 'Missing',
            value: summary.missing,
            icon: XCircle,
            className: 'bg-red-100 text-red-600',
        },
        {
            label: 'Ready For Review',
            value: summary.submitted,
            icon: FileSearch,
            className: 'bg-blue-100 text-blue-600',
        },
        {
            label: 'Approved',
            value: summary.approved,
            icon: CheckCircle,
            className: 'bg-green-100 text-green-600',
        },
        {
            label: 'Time-Sensitive',
            value: summary.expiringSoon + summary.expired,
            icon: AlertTriangle,
            className: 'bg-amber-100 text-amber-600',
        },
    ]), [summary]);

    const handleApprove = async (document: ComplianceDocument) => {
        setActingId(document.id);
        try {
            const response = await adminApi.approveProvider(document.provider_type as any, document.provider_id);
            if (!response.success) {
                throw new Error(response.error || 'Failed to approve provider');
            }
            await fetchCompliance();
        } catch (approveError) {
            setError(approveError instanceof Error ? approveError.message : 'Failed to approve provider');
        } finally {
            setActingId(null);
        }
    };

    const handleReject = async () => {
        if (!rejectTarget || !rejectReason.trim()) return;
        setActingId(rejectTarget.id);
        try {
            const response = await adminApi.rejectProvider(rejectTarget.provider_type as any, rejectTarget.provider_id, rejectReason.trim());
            if (!response.success) {
                throw new Error(response.error || 'Failed to reject provider');
            }
            setRejectTarget(null);
            setRejectReason('');
            await fetchCompliance();
        } catch (rejectError) {
            setError(rejectError instanceof Error ? rejectError.message : 'Failed to reject provider');
        } finally {
            setActingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Compliance Management</h1>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">
                        Review provider documents, missing requirements, and time-sensitive renewals across the platform.
                    </p>
                </div>
                <Button variant="outline" onClick={fetchCompliance} leftIcon={<RefreshCw className="h-4 w-4" />}>
                    Refresh
                </Button>
            </div>

            {coverageNote && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    {coverageNote}
                </div>
            )}

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <Card key={card.label} padding="md">
                            <div className="flex items-center gap-4">
                                <div className={`rounded-xl p-3 ${card.className}`}>
                                    <Icon className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{card.label}</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{card.value}</p>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            <Card padding="md">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                    <Input
                        placeholder="Search provider, document, or identifier..."
                        value={searchQuery}
                        onChange={(event) => {
                            setSearchQuery(event.target.value);
                            setPage(1);
                        }}
                    />
                    <select
                        value={providerType}
                        onChange={(event) => {
                            setProviderType(event.target.value);
                            setPage(1);
                        }}
                        className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    >
                        {PROVIDER_TYPES.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(event) => {
                            setStatusFilter(event.target.value);
                            setPage(1);
                        }}
                        className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    >
                        {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                    <select
                        value={days}
                        onChange={(event) => {
                            setDays(Number(event.target.value));
                            setPage(1);
                        }}
                        className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    >
                        <option value={7}>Next 7 days</option>
                        <option value={30}>Next 30 days</option>
                        <option value={60}>Next 60 days</option>
                        <option value={90}>Next 90 days</option>
                    </select>
                </div>
            </Card>

            <Card padding="none">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Provider Documents
                    </CardTitle>
                </CardHeader>
                {isLoading ? (
                    <div className="flex items-center justify-center p-12">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        <span className="ml-2 text-gray-500 dark:text-gray-400">Loading compliance documents...</span>
                    </div>
                ) : documents.length === 0 ? (
                    <div className="p-10 text-center text-gray-500 dark:text-gray-400">
                        <FileText className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                        <p>No compliance records matched the current filters.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {documents.map((document) => (
                            <div key={document.id} className="p-5">
                                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                    <div className="space-y-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                                {document.provider_name}
                                            </h3>
                                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                                                {document.provider_type_label}
                                            </span>
                                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusPillClass(document.status)}`}>
                                                {formatStatus(document.status)}
                                            </span>
                                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                                Provider: {formatStatus(document.provider_status)}
                                            </span>
                                        </div>

                                        <div>
                                            <p className="font-medium text-gray-800 dark:text-gray-100">{document.document_type}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {document.contact_name || 'Owner / primary contact'}
                                                {document.email ? ` • ${document.email}` : ''}
                                                {document.phone ? ` • ${document.phone}` : ''}
                                            </p>
                                        </div>

                                        {document.identifiers.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {document.identifiers.map((identifier) => (
                                                    <span
                                                        key={`${document.id}:${identifier.key}`}
                                                        className="rounded-lg bg-gray-100 px-3 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                                                    >
                                                        {identifier.label}: {identifier.value}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {document.missing_items.length > 0 && (
                                            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                                Missing: {document.missing_items.join(', ')}
                                            </div>
                                        )}

                                        {document.expiry_date && (
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                Expires on {new Date(document.expiry_date).toLocaleDateString('en-IN')}
                                                {document.days_until_expiry != null ? ` • ${document.days_until_expiry} days left` : ''}
                                            </div>
                                        )}

                                        {document.approval_notes && (
                                            <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                                Admin note: {document.approval_notes}
                                            </div>
                                        )}

                                        {document.provider_approval_block_reason && (
                                            <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                                Approval readiness: {document.provider_approval_block_reason}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2 xl:min-w-[220px]">
                                        {document.document_url ? (
                                            <a
                                                href={document.document_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                                Open Document
                                            </a>
                                        ) : (
                                            <div className="rounded-lg border border-dashed border-gray-300 px-4 py-2 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                                                No document URL yet
                                            </div>
                                        )}

                                        {(document.provider_status === 'pending' || document.provider_status === 'under_review') && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleApprove(document)}
                                                    isLoading={actingId === document.id}
                                                    disabled={!document.can_approve_provider}
                                                >
                                                    Approve Provider
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setRejectTarget(document);
                                                        setRejectReason('');
                                                    }}
                                                    disabled={actingId === document.id}
                                                >
                                                    Reject Provider
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={setPage}
                    totalItems={pagination.total}
                    itemsPerPage={pagination.limit}
                />
            </Card>

            {rejectTarget && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) {
                            setRejectTarget(null);
                            setRejectReason('');
                        }
                    }}
                >
                    <Card padding="lg" className="w-full max-w-md">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Reject Provider</h3>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {rejectTarget.provider_name} will receive this reason in the provider workflow.
                        </p>
                        <textarea
                            value={rejectReason}
                            onChange={(event) => setRejectReason(event.target.value)}
                            rows={4}
                            className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                            placeholder="Explain what needs to be fixed before resubmission..."
                        />
                        <div className="mt-4 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => {
                                setRejectTarget(null);
                                setRejectReason('');
                            }}>
                                Cancel
                            </Button>
                            <Button
                                variant="danger"
                                onClick={handleReject}
                                isLoading={actingId === rejectTarget.id}
                                disabled={!rejectReason.trim()}
                            >
                                Reject
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
