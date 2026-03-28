'use client';

import { useDeferredValue, useEffect, useState } from 'react';
import { Stethoscope, Search, Loader2, RefreshCw, UserPlus, Trash2, AlertCircle, X, Building2, Mail, Phone } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useHospitalStore } from '@/stores/hospitalStore';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Pagination } from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';

export default function HospitalDoctorsPage() {
    const { doctors, loadingDoctors, error, doctorsPagination, fetchDoctors, inviteDoctor, removeDoctor, clearError } = useHospitalStore();
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [showInviteModal, setShowInviteModal] = useState(false);
    const deferredSearchQuery = useDeferredValue(searchQuery.trim());
    const [inviteData, setInviteData] = useState({ email: '', department: '' });
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const { dialogProps, confirm } = useConfirmDialog();
    const toast = useToast();
    const pageSize = 10;

    useEffect(() => {
        fetchDoctors(page, deferredSearchQuery, pageSize);
    }, [deferredSearchQuery, fetchDoctors, page]);

    useEffect(() => {
        setPage(1);
    }, [searchQuery]);

    const handleInvite = async () => {
        if (!inviteData.email) return;
        setActionLoading('invite');
        const success = await inviteDoctor(inviteData);
        if (success) {
            setShowInviteModal(false);
            setInviteData({ email: '', department: '' });
            toast.success('Doctor linked', 'The doctor was added to your hospital roster.');
        } else {
            toast.error('Unable to link doctor', 'Please confirm the doctor account exists and try again.');
        }
        setActionLoading(null);
    };

    const handleRemove = async (doctorId: string, doctorName: string) => {
        const confirmed = await confirm({ title: 'Remove Doctor', message: `Remove Dr. ${doctorName} from the hospital?`, confirmLabel: 'Remove', variant: 'danger' });
        if (!confirmed) return;
        setActionLoading(doctorId);
        const success = await removeDoctor(doctorId);
        if (success) {
            toast.success('Doctor Removed', 'Doctor has been removed');
        } else {
            toast.error('Unable to remove doctor', 'Please try again in a moment.');
        }
        setActionLoading(null);
    };

    if (loadingDoctors && doctors.length === 0) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <AlertCircle className="h-12 w-12 text-red-400" />
                <p className="text-red-600">{error}</p>
                <Button onClick={() => { clearError(); fetchDoctors(page, deferredSearchQuery, pageSize); }} leftIcon={<RefreshCw className="h-4 w-4" />}>Retry</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div><h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Doctors</h1><p className="text-gray-600 dark:text-gray-400 mt-1">Manage hospital doctors</p></div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => fetchDoctors(page, deferredSearchQuery, pageSize)} leftIcon={<RefreshCw className="h-4 w-4" />} disabled={loadingDoctors}>Refresh</Button>
                    <Button onClick={() => setShowInviteModal(true)} leftIcon={<UserPlus className="h-4 w-4" />}>Invite Doctor</Button>
                </div>
            </div>

            <Card padding="sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="w-full lg:max-w-md">
                        <Input placeholder="Search doctors by name, specialization, department, or contact..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} leftIcon={<Search className="h-5 w-5" />} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="rounded-full bg-teal-50 px-3 py-1 text-teal-700">{doctorsPagination.total || 0} doctors</span>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">Page {doctorsPagination.page || page} of {doctorsPagination.totalPages || 1}</span>
                    </div>
                </div>
            </Card>

            <Card padding="none">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Doctor</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Specialization</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400 hidden lg:table-cell">Department</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400 hidden md:table-cell">Contact</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400 hidden sm:table-cell">Status</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {doctors.length === 0 ? (
                                <tr><td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">No doctors found</td></tr>
                            ) : doctors.map((doc: any) => (
                                <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-teal-100 rounded-lg"><Stethoscope className="h-4 w-4 text-teal-600" /></div>
                                            <div>
                                                <span className="font-medium text-gray-900 dark:text-gray-100">{doc.name}</span>
                                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Today: {doc.appointmentsToday || 0} appointments</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{doc.specialization || '—'}</td>
                                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 hidden lg:table-cell">
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-gray-800 dark:text-gray-300">
                                            <Building2 className="h-3.5 w-3.5" />
                                            {doc.department || 'Unassigned'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 hidden md:table-cell">
                                        <div className="space-y-1">
                                            {doc.email ? <div className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{doc.email}</div> : null}
                                            {doc.phone ? <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{doc.phone}</div> : !doc.email ? '—' : null}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 hidden sm:table-cell"><StatusBadge status={doc.status || 'approved'} size="sm" /></td>
                                    <td className="py-3 px-4 text-right">
                                        <Button size="sm" variant="outline" onClick={() => handleRemove(doc.id, doc.name)} disabled={actionLoading === doc.id}>
                                            {actionLoading === doc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3 text-red-500" />}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
            <Pagination
                currentPage={page}
                totalPages={doctorsPagination.totalPages || 1}
                onPageChange={setPage}
                totalItems={doctorsPagination.total || doctors.length}
                itemsPerPage={pageSize}
            />

            {/* Invite Doctor Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Invite Doctor</h3>
                            <button onClick={() => setShowInviteModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                                Use the email of an existing approved doctor account to link it to this hospital.
                            </div>
                            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Doctor Email *</label><Input value={inviteData.email} onChange={e => setInviteData(d => ({ ...d, email: e.target.value }))} placeholder="doctor@example.com" /></div>
                            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label><Input value={inviteData.department} onChange={e => setInviteData(d => ({ ...d, department: e.target.value }))} placeholder="Cardiology, Emergency, Pediatrics..." /></div>
                        </div>
                        <div className="flex justify-end gap-2 p-4 border-t">
                            <Button variant="outline" onClick={() => setShowInviteModal(false)}>Cancel</Button>
                            <Button onClick={handleInvite} isLoading={actionLoading === 'invite'}>Send Invite</Button>
                        </div>
                    </div>
                </div>
            )}
            <ConfirmDialog {...dialogProps} />
        </div>
    );
}
