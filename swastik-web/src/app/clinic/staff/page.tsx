'use client';

import { useCallback, useDeferredValue, useEffect, useState } from 'react';
import { Stethoscope, Loader2, Trash2, AlertCircle, RefreshCw, X, UserPlus, Search, Mail, Phone } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useClinicStore } from '@/stores/clinicStore';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Pagination } from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import { StatusBadge } from '@/components/ui/StatusBadge';

const PAGE_SIZE = 9;

export default function ClinicStaffPage() {
    const {
        doctors,
        doctorsPagination,
        loadingDoctors,
        error,
        fetchDoctors,
        addDoctor,
        removeDoctor,
        clearError,
    } = useClinicStore();

    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ email: '' });
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const { dialogProps, confirm } = useConfirmDialog();
    const toast = useToast();
    const deferredSearchQuery = useDeferredValue(searchQuery.trim());

    const loadDoctors = useCallback(async () => {
        await fetchDoctors({
            page,
            limit: PAGE_SIZE,
            search: deferredSearchQuery || undefined,
        });
    }, [deferredSearchQuery, fetchDoctors, page]);

    useEffect(() => {
        void loadDoctors();
    }, [loadDoctors]);

    useEffect(() => {
        setPage(1);
    }, [deferredSearchQuery]);

    useEffect(() => {
        if (page > doctorsPagination.totalPages) {
            setPage(doctorsPagination.totalPages);
        }
    }, [doctorsPagination.totalPages, page]);

    const handleAdd = async () => {
        if (!form.email.trim()) return;
        setActionLoading('add');
        const success = await addDoctor({ email: form.email.trim() });
        if (success) {
            toast.success('Doctor Added', 'The doctor is now linked to this clinic.');
            setShowAdd(false);
            setForm({ email: '' });
            clearError();
            await loadDoctors();
        } else {
            toast.error('Unable to add doctor', useClinicStore.getState().error || 'Check the doctor email and try again.');
        }
        setActionLoading(null);
    };

    const handleRemove = async (id: string, name: string) => {
        const confirmed = await confirm({ title: 'Remove Staff', message: `Remove ${name} from clinic?`, confirmLabel: 'Remove', variant: 'danger' });
        if (!confirmed) return;
        setActionLoading(id);
        const success = await removeDoctor(id);
        if (success) {
            toast.success('Doctor Removed', `${name} has been removed from this clinic.`);
            clearError();
            await loadDoctors();
        } else {
            toast.error('Unable to remove doctor', useClinicStore.getState().error || 'Please try again.');
        }
        setActionLoading(null);
    };

    const staff = Array.isArray(doctors) ? doctors : [];

    if (loadingDoctors && staff.length === 0) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-pink-600" /></div>;
    }

    if (error && staff.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <AlertCircle className="h-12 w-12 text-red-400" />
                <p className="text-red-600">{error}</p>
                <Button onClick={() => { clearError(); void loadDoctors(); }} leftIcon={<RefreshCw className="h-4 w-4" />}>Retry</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div><h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Staff</h1><p className="text-gray-600 dark:text-gray-400 mt-1">Manage clinic doctors linked to this clinic</p></div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => void loadDoctors()} disabled={loadingDoctors} leftIcon={<RefreshCw className={`h-4 w-4 ${loadingDoctors ? 'animate-spin' : ''}`} />}>Refresh</Button>
                    <Button onClick={() => setShowAdd(true)} leftIcon={<UserPlus className="h-4 w-4" />}>Add Doctor</Button>
                </div>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

            <Card padding="sm">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                    <Input
                        placeholder="Search by name, specialization, email, phone, or status..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        leftIcon={<Search className="h-5 w-5" />}
                    />
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="rounded-full bg-pink-50 px-3 py-1 text-pink-700">{doctorsPagination.total} doctors</span>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">Page {doctorsPagination.page} of {doctorsPagination.totalPages}</span>
                    </div>
                </div>
            </Card>

            {/* Add Doctor Modal */}
            {showAdd && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <Card padding="lg" className="w-full max-w-md">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Add Doctor to Clinic</h2>
                            <button onClick={() => setShowAdd(false)}><X className="h-5 w-5 text-gray-400" /></button>
                        </div>
                        <div className="space-y-3">
                            <Input label="Doctor Email *" type="email" value={form.email} onChange={e => setForm({ email: e.target.value })} placeholder="Enter existing doctor account email" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Only approved doctor accounts can be linked here. Enter the email used in the doctor portal.
                            </p>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                            <Button onClick={handleAdd} isLoading={actionLoading === 'add'} disabled={!form.email.trim()}>Add Doctor</Button>
                        </div>
                    </Card>
                </div>
            )}

            {staff.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <Stethoscope className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No doctors linked to this clinic yet.</p>
                    <p className="text-sm mt-1">Click &quot;Add Doctor&quot; to invite one.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {staff.map((member) => (
                        <Card key={member.associationId || member.id} padding="md">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-pink-100 rounded-full"><Stethoscope className="h-5 w-5 text-pink-600" /></div>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-gray-100">{member.name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{member.specialization || 'General Practice'}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemove(member.id, member.name)}
                                    disabled={actionLoading === member.id}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    {actionLoading === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </button>
                            </div>
                            <div className="mt-4 space-y-3">
                                <StatusBadge status={member.status} size="sm" />
                                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-gray-400" />
                                        <span className="truncate">{member.email || 'Email not available'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-gray-400" />
                                        <span>{member.phone || 'Phone not available'}</span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
            <Pagination
                currentPage={page}
                totalPages={doctorsPagination.totalPages}
                onPageChange={setPage}
                totalItems={doctorsPagination.total}
                itemsPerPage={PAGE_SIZE}
            />
            <ConfirmDialog {...dialogProps} />
        </div>
    );
}
