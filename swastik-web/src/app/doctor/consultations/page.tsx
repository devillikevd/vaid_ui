'use client';

import { useEffect, useState } from 'react';
import { Video, MessageSquare, Clock, User, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useDoctorStore, type Consultation } from '@/stores/doctorStore';
import Link from 'next/link';

export default function DoctorConsultationsPage() {
    const { consultations, loadingConsultations, error, fetchConsultations, clearError, endConsultation } = useDoctorStore();

    useEffect(() => { fetchConsultations(); }, []);

    if (loadingConsultations) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /><span className="ml-2 text-gray-600 dark:text-gray-400">Loading consultations...</span></div>;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <AlertCircle className="h-12 w-12 text-red-400" />
                <p className="text-red-600">{error}</p>
                <Button onClick={() => { clearError(); fetchConsultations(); }} leftIcon={<RefreshCw className="h-4 w-4" />}>Retry</Button>
            </div>
        );
    }

    const handleEndCall = async (c: Consultation) => {
        if (!confirm('Are you sure you want to forcefully end this consultation?')) return;
        if (c.appointment?.id) {
            await endConsultation(c.appointment.id, c.id);
        } else {
            console.error('No appointment ID found for consultation');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div><h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Consultations</h1><p className="text-gray-600 dark:text-gray-400 mt-1">Active and past consultations</p></div>
                <Button onClick={() => fetchConsultations()} leftIcon={<RefreshCw className="h-4 w-4" />}>Refresh</Button>
            </div>

            <Card padding="none">
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {(!consultations || consultations.length === 0) ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">No consultations found</div>
                    ) : consultations.map((c: Consultation) => (
                        <div key={c.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl shadow-sm border ${(c.type || c.appointment?.type) === 'video' ? 'bg-blue-50/50 border-blue-100 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-emerald-50/50 border-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-800'}`}>
                                            {(c.type || c.appointment?.type) === 'video' ? <Video className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-gray-100">{c.patientName || (c.appointment as any)?.patientName || 'Unknown Patient'}</p>
                                            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                                                <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-md">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    {(c.appointment?.appointment_date || c.created_at) ? new Date(c.appointment?.appointment_date || c.created_at!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                                </span>
                                                {c.startedAt && (
                                                    <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-md">
                                                        Start: {new Date(c.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                )}
                                                <span className="capitalize font-medium text-gray-600 dark:text-gray-300">
                                                    • {c.type || c.appointment?.type || 'In-person'} Consult
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                <div className="flex items-center gap-3">
                                    <StatusBadge status={c.status || 'scheduled'} size="sm" />
                                    {['in_progress', 'active'].includes(c.status) && 
                                     new Date(c.appointment?.appointment_date || c.created_at!).toDateString() === new Date().toDateString() && (
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="outline" onClick={() => handleEndCall(c)} className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300">End Call</Button>
                                            <Link href={`/consultation/${c.id}`}>
                                                <Button size="sm" variant="primary">Join</Button>
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
