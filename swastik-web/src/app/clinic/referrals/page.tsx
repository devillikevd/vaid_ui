'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Building2, Search, Filter, Clock, User, Stethoscope, 
    AlertCircle, CheckCircle2, XCircle, ArrowRight, ShieldCheck, 
    FileText, Ban, Eye, RefreshCw, ChevronRight, ExternalLink,
    Building, AlertTriangle, Activity
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { clinicApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export interface PatientReferral {
    id: string;
    patient_id: string;
    referring_clinic_id: string;
    target_hospital_id: string;
    referring_doctor_id: string;
    consultation_id?: string;
    reason: string;
    urgency: 'routine' | 'urgent' | 'emergency';
    clinical_summary?: string;
    consent_granted: boolean;
    status: 'pending' | 'accepted' | 'admission_pending' | 'admitted' | 'discharged' | 'cancelled' | 'rejected';
    created_at: string;
    updated_at: string;
    accepted_at?: string;
    admitted_at?: string;
    discharged_at?: string;
    discharge_summary?: string;
    rejection_reason?: string;
    patient?: {
        id?: string;
        name: string;
        gender?: string;
        date_of_birth?: string;
    };
    hospital?: {
        id: string;
        name: string;
    };
    doctor?: {
        id: string;
        users?: {
            name: string;
        };
    };
}

export default function ClinicHospitalReferralsPage() {
    const toast = useToast();
    const router = useRouter();

    const [referrals, setReferrals] = useState<PatientReferral[]>([]);
    const [loading, setLoading] = useState(true);
    const [partnerships, setPartnerships] = useState<any[]>([]);
    const [loadingPartnerships, setLoadingPartnerships] = useState(true);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [urgencyFilter, setUrgencyFilter] = useState<string>('all');

    // Modals
    const [selectedReferral, setSelectedReferral] = useState<PatientReferral | null>(null);
    const [dischargeModalReferral, setDischargeModalReferral] = useState<PatientReferral | null>(null);
    const [cancellingReferral, setCancellingReferral] = useState<PatientReferral | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);

    // Load active hospital partnerships
    const loadPartnerships = useCallback(async () => {
        setLoadingPartnerships(true);
        try {
            const res = await clinicApi.getPartnerships('active');
            if (res.success) {
                const hospitalPartners = ((res.data as any[]) || []).filter(
                    (p: any) => p.target_type === 'hospital' || p.targetType === 'hospital'
                );
                setPartnerships(hospitalPartners);
            }
        } catch (err) {
            console.error('Failed to load clinic partnerships:', err);
        } finally {
            setLoadingPartnerships(false);
        }
    }, []);

    // Load outgoing referrals
    const loadReferrals = useCallback(async () => {
        setLoading(true);
        try {
            const res = await clinicApi.getReferrals(statusFilter !== 'all' ? statusFilter : undefined);
            if (res.success) {
                setReferrals((res.data as PatientReferral[]) || []);
            } else {
                toast.error('Failed to load referrals', res.error || 'Please try again.');
            }
        } catch {
            toast.error('Network error loading referrals');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, toast]);

    useEffect(() => {
        loadPartnerships();
    }, [loadPartnerships]);

    useEffect(() => {
        loadReferrals();
    }, [loadReferrals]);

    const handleCancelReferral = async () => {
        if (!cancellingReferral) return;
        setIsCancelling(true);
        try {
            const res = await clinicApi.cancelReferral(cancellingReferral.id);
            if (res.success) {
                toast.success('Referral cancelled successfully');
                setCancellingReferral(null);
                loadReferrals();
            } else {
                toast.error('Failed to cancel referral', res.error || 'Referral may already be processed.');
            }
        } catch {
            toast.error('Error cancelling referral');
        } finally {
            setIsCancelling(false);
        }
    };

    // Filter & Search computation
    const filteredReferrals = useMemo(() => {
        return referrals.filter(r => {
            const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
            const matchesUrgency = urgencyFilter === 'all' || r.urgency === urgencyFilter;

            const q = searchQuery.toLowerCase().trim();
            const patientName = r.patient?.name?.toLowerCase() || '';
            const hospitalName = r.hospital?.name?.toLowerCase() || '';
            const doctorName = r.doctor?.users?.name?.toLowerCase() || '';
            const referralId = r.id.toLowerCase();
            const reason = r.reason?.toLowerCase() || '';

            const matchesSearch = !q || 
                patientName.includes(q) ||
                hospitalName.includes(q) ||
                doctorName.includes(q) ||
                referralId.includes(q) ||
                reason.includes(q);

            return matchesStatus && matchesUrgency && matchesSearch;
        });
    }, [referrals, statusFilter, urgencyFilter, searchQuery]);

    const getStatusBadge = (status: PatientReferral['status']) => {
        switch (status) {
            case 'pending':
                return {
                    label: 'Pending Review',
                    bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40',
                    dot: 'bg-amber-500'
                };
            case 'accepted':
                return {
                    label: 'Accepted by Hospital',
                    bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/40',
                    dot: 'bg-blue-500'
                };
            case 'admission_pending':
                return {
                    label: 'Admission Pending',
                    bg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900/40',
                    dot: 'bg-purple-500'
                };
            case 'admitted':
                return {
                    label: 'Patient Admitted',
                    bg: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-900/40',
                    dot: 'bg-indigo-500 animate-pulse'
                };
            case 'discharged':
                return {
                    label: 'Discharged / Care Completed',
                    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40',
                    dot: 'bg-emerald-500'
                };
            case 'cancelled':
                return {
                    label: 'Cancelled by Clinic',
                    bg: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
                    dot: 'bg-gray-400'
                };
            case 'rejected':
                return {
                    label: 'Declined by Hospital',
                    bg: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/40',
                    dot: 'bg-red-500'
                };
            default:
                return {
                    label: status,
                    bg: 'bg-gray-100 text-gray-700 border-gray-200',
                    dot: 'bg-gray-400'
                };
        }
    };

    const getUrgencyBadge = (urgency: PatientReferral['urgency']) => {
        switch (urgency) {
            case 'emergency':
                return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50 font-black';
            case 'urgent':
                return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/50 font-bold';
            case 'routine':
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-semibold';
        }
    };

    return (
        <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300 border border-pink-200/50 dark:border-pink-800/40">
                            Operations
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        <Building2 className="w-8 h-8 text-pink-600 dark:text-pink-400" />
                        Hospital Referrals
                    </h1>
                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
                        Track patients referred to your active hospital partners.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={loadReferrals} 
                        className="rounded-xl"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                    <Button 
                        onClick={() => router.push('/clinic/patients')}
                        className="bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold"
                    >
                        <User className="w-4 h-4 mr-1.5" /> Refer from Patients
                    </Button>
                </div>
            </div>

            {/* Warning Banner if No Active Hospital Partners */}
            {!loadingPartnerships && partnerships.length === 0 && (
                <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-extrabold text-sm text-amber-900 dark:text-amber-200">
                                No active hospital partners
                            </h4>
                            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                                Establish an active hospital partnership in the Partnerships Hub before referring patients for hospital admission or inpatient care.
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push('/clinic/partnerships')}
                        className="bg-white dark:bg-gray-900 border-amber-300 text-amber-800 dark:text-amber-300 font-bold rounded-xl text-xs shrink-0"
                    >
                        Manage Partnerships <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            )}

            {/* Filter & Search Bar */}
            <div className="bg-white dark:bg-gray-900 p-4 sm:p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
                    <div className="flex items-center gap-1.5 mr-2 text-xs font-bold text-gray-500">
                        <Filter className="w-3.5 h-3.5" /> Status:
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-800 border-none text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-pink-500"
                    >
                        <option value="all">All Statuses ({referrals.length})</option>
                        <option value="pending">Pending</option>
                        <option value="accepted">Accepted</option>
                        <option value="admission_pending">Admission Pending</option>
                        <option value="admitted">Admitted</option>
                        <option value="discharged">Discharged</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="rejected">Rejected</option>
                    </select>

                    <select
                        value={urgencyFilter}
                        onChange={(e) => setUrgencyFilter(e.target.value)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gray-50 dark:bg-gray-800 border-none text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-pink-500"
                    >
                        <option value="all">All Urgency</option>
                        <option value="routine">Routine</option>
                        <option value="urgent">Urgent</option>
                        <option value="emergency">Emergency</option>
                    </select>
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search patient, hospital, doctor, referral ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-gray-50 dark:bg-gray-800 border-none text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500"
                    />
                </div>
            </div>

            {/* Referral Cards Grid */}
            {loading ? (
                <div className="p-16 text-center bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
                    <div className="animate-spin w-8 h-8 border-4 border-pink-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-500 text-sm font-bold">Loading hospital referrals...</p>
                </div>
            ) : filteredReferrals.length === 0 ? (
                <div className="p-16 text-center bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-pink-50 dark:bg-pink-950/30 text-pink-600 dark:text-pink-400 flex items-center justify-center mx-auto">
                        <Building2 className="w-8 h-8" />
                    </div>
                    <div className="max-w-md mx-auto">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            No hospital referrals yet
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                            Patients you refer to active hospital partners will appear here.
                        </p>
                    </div>
                    <div className="flex justify-center gap-3 pt-2">
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => router.push('/clinic/partnerships')}
                            className="rounded-xl text-xs font-bold"
                        >
                            View Partnerships
                        </Button>
                        <Button 
                            size="sm"
                            onClick={() => router.push('/clinic/patients')}
                            className="bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold"
                        >
                            View Patients
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredReferrals.map((referral) => {
                        const statusBadge = getStatusBadge(referral.status);
                        const patientName = referral.patient?.name || 'Patient';
                        const hospitalName = referral.hospital?.name || 'Partner Hospital';
                        const doctorName = referral.doctor?.users?.name || 'Clinic Physician';

                        return (
                            <motion.div
                                key={referral.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5"
                            >
                                <div className="space-y-4">
                                    {/* Top Metadata Row */}
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <span className="font-mono text-[11px] font-bold text-gray-400 bg-gray-50 dark:bg-gray-800/80 px-2.5 py-1 rounded-lg">
                                            REF-{referral.id.slice(0, 8).toUpperCase()}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase border ${getUrgencyBadge(referral.urgency)}`}>
                                                {referral.urgency}
                                            </span>
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border flex items-center gap-1.5 ${statusBadge.bg}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                                                {statusBadge.label}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Patient & Hospital Info */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <User className="w-4 h-4 text-gray-400" />
                                            <h3 className="font-extrabold text-base text-gray-900 dark:text-white truncate">
                                                {patientName}
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-bold text-pink-600 dark:text-pink-400">
                                            <Building className="w-3.5 h-3.5" />
                                            <span className="truncate">{hospitalName}</span>
                                        </div>
                                    </div>

                                    {/* Reason */}
                                    <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-300 space-y-1">
                                        <p className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Reason for Referral</p>
                                        <p className="line-clamp-2 font-medium">{referral.reason}</p>
                                    </div>

                                    {/* Referring Doctor & Timestamps */}
                                    <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                                        <p className="flex items-center gap-1.5">
                                            <Stethoscope className="w-3.5 h-3.5 text-gray-400" />
                                            <span>Doctor: <strong className="text-gray-700 dark:text-gray-200">Dr. {doctorName}</strong></span>
                                        </p>
                                        <p className="flex items-center gap-1.5 text-[11px]">
                                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                                            Created: {new Date(referral.created_at).toLocaleDateString()}
                                        </p>
                                        {referral.admitted_at && (
                                            <p className="flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                                                <Activity className="w-3.5 h-3.5" />
                                                Admitted: {new Date(referral.admitted_at).toLocaleDateString()}
                                            </p>
                                        )}
                                        {referral.discharged_at && (
                                            <p className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                Discharged: {new Date(referral.discharged_at).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedReferral(referral)}
                                        className="text-xs font-bold rounded-xl flex-1"
                                    >
                                        <Eye className="w-3.5 h-3.5 mr-1" /> View Details
                                    </Button>

                                    {referral.status === 'pending' && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setCancellingReferral(referral)}
                                            className="text-xs font-bold rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                        >
                                            <Ban className="w-3.5 h-3.5 mr-1" /> Cancel
                                        </Button>
                                    )}

                                    {referral.status === 'discharged' && referral.discharge_summary && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setDischargeModalReferral(referral)}
                                            className="text-xs font-bold rounded-xl text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                        >
                                            <FileText className="w-3.5 h-3.5 mr-1" /> Summary
                                        </Button>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Referral Details Modal */}
            <AnimatePresence>
                {selectedReferral && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden max-h-[90vh] flex flex-col"
                        >
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gradient-to-r from-pink-50/50 to-purple-50/50 dark:from-pink-950/20 dark:to-purple-950/20">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-mono text-xs font-bold text-gray-500">
                                            REF-{selectedReferral.id.slice(0, 8).toUpperCase()}
                                        </span>
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase border ${getUrgencyBadge(selectedReferral.urgency)}`}>
                                            {selectedReferral.urgency}
                                        </span>
                                    </div>
                                    <h3 className="font-black text-xl text-gray-900 dark:text-white">
                                        Hospital Referral Details
                                    </h3>
                                </div>
                                <button onClick={() => setSelectedReferral(null)} className="text-gray-400 hover:text-gray-600">
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6 overflow-y-auto">
                                {/* Care Partner Badges */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 space-y-1">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Patient</p>
                                        <p className="text-base font-extrabold text-gray-900 dark:text-white">
                                            {selectedReferral.patient?.name || 'Patient'}
                                        </p>
                                        {selectedReferral.patient?.gender && (
                                            <p className="text-xs text-gray-500 capitalize">
                                                {selectedReferral.patient.gender}
                                                {selectedReferral.patient.date_of_birth ? ` • DOB: ${new Date(selectedReferral.patient.date_of_birth).toLocaleDateString()}` : ''}
                                            </p>
                                        )}
                                    </div>

                                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 space-y-1">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Target Hospital</p>
                                        <p className="text-base font-extrabold text-pink-600 dark:text-pink-400">
                                            {selectedReferral.hospital?.name || 'Hospital Partner'}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Referring: Dr. {selectedReferral.doctor?.users?.name || 'Clinic Physician'}
                                        </p>
                                    </div>
                                </div>

                                {/* Consent & Status Row */}
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                        Patient Consent: Granted & Verified
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${getStatusBadge(selectedReferral.status).bg}`}>
                                        {getStatusBadge(selectedReferral.status).label}
                                    </span>
                                </div>

                                {/* Reason & Summary */}
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                                            Reason for Referral
                                        </label>
                                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800/50 p-3.5 rounded-2xl">
                                            {selectedReferral.reason}
                                        </p>
                                    </div>

                                    {selectedReferral.clinical_summary && (
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                                                Clinical Summary & Vitals
                                            </label>
                                            <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-3.5 rounded-2xl whitespace-pre-wrap leading-relaxed">
                                                {selectedReferral.clinical_summary}
                                            </div>
                                        </div>
                                    )}

                                    {selectedReferral.rejection_reason && (
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-red-500 mb-1">
                                                Hospital Decline Reason
                                            </label>
                                            <p className="text-sm font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30 p-3.5 rounded-2xl border border-red-200/50">
                                                {selectedReferral.rejection_reason}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Care Timeline */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                                        Referral Timeline
                                    </label>
                                    <div className="space-y-2 border-l-2 border-pink-200 dark:border-pink-900/40 ml-3 pl-4 text-xs space-y-3">
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white">Referral Initiated by Clinic</p>
                                            <p className="text-gray-400">{new Date(selectedReferral.created_at).toLocaleString()}</p>
                                        </div>
                                        {selectedReferral.accepted_at && (
                                            <div>
                                                <p className="font-bold text-blue-600 dark:text-blue-400">Accepted by Hospital</p>
                                                <p className="text-gray-400">{new Date(selectedReferral.accepted_at).toLocaleString()}</p>
                                            </div>
                                        )}
                                        {selectedReferral.admitted_at && (
                                            <div>
                                                <p className="font-bold text-indigo-600 dark:text-indigo-400">Patient Admitted to Hospital</p>
                                                <p className="text-gray-400">{new Date(selectedReferral.admitted_at).toLocaleString()}</p>
                                            </div>
                                        )}
                                        {selectedReferral.discharged_at && (
                                            <div>
                                                <p className="font-bold text-emerald-600 dark:text-emerald-400">Patient Discharged</p>
                                                <p className="text-gray-400">{new Date(selectedReferral.discharged_at).toLocaleString()}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/40">
                                {selectedReferral.status === 'discharged' && selectedReferral.discharge_summary && (
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            const ref = selectedReferral;
                                            setSelectedReferral(null);
                                            setDischargeModalReferral(ref);
                                        }}
                                        className="text-xs font-bold rounded-xl"
                                    >
                                        <FileText className="w-3.5 h-3.5 mr-1 text-emerald-600" /> View Discharge Summary
                                    </Button>
                                )}
                                <Button onClick={() => setSelectedReferral(null)} className="rounded-xl text-xs font-bold">
                                    Close
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Discharge Summary Modal */}
            <AnimatePresence>
                {dischargeModalReferral && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
                        >
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-emerald-50/50 dark:bg-emerald-950/20">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                                    <div>
                                        <h3 className="font-extrabold text-lg text-gray-900 dark:text-white">
                                            Discharge Summary
                                        </h3>
                                        <p className="text-xs text-gray-500">
                                            {dischargeModalReferral.patient?.name} • {dischargeModalReferral.hospital?.name}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setDischargeModalReferral(null)} className="text-gray-400 hover:text-gray-600">
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4 text-sm">
                                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 space-y-2">
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>Discharge Date:</span>
                                        <span className="font-bold text-gray-700 dark:text-gray-200">
                                            {dischargeModalReferral.discharged_at ? new Date(dischargeModalReferral.discharged_at).toLocaleString() : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>Admitting Hospital:</span>
                                        <span className="font-bold text-gray-700 dark:text-gray-200">
                                            {dischargeModalReferral.hospital?.name}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                                        Clinical Discharge Notes
                                    </label>
                                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                                        {dischargeModalReferral.discharge_summary || 'No discharge summary notes provided.'}
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                                <Button onClick={() => setDischargeModalReferral(null)} className="rounded-xl text-xs font-bold">
                                    Close Summary
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Cancel Confirmation Dialog */}
            <AnimatePresence>
                {cancellingReferral && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-800 p-6 space-y-4"
                        >
                            <div className="flex items-center gap-3 text-red-600">
                                <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center shrink-0">
                                    <Ban className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-lg text-gray-900 dark:text-white">
                                        Cancel Referral?
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        REF-{cancellingReferral.id.slice(0, 8).toUpperCase()}
                                    </p>
                                </div>
                            </div>

                            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                                Are you sure you want to cancel the referral for <strong>{cancellingReferral.patient?.name}</strong> to <strong>{cancellingReferral.hospital?.name}</strong>? This action cannot be undone once confirmed.
                            </p>

                            <div className="flex justify-end gap-3 pt-2">
                                <Button variant="outline" size="sm" onClick={() => setCancellingReferral(null)} disabled={isCancelling}>
                                    Keep Referral
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleCancelReferral}
                                    disabled={isCancelling}
                                    className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold"
                                >
                                    {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
