'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Loader2, AlertCircle, ChevronRight, CheckCircle2, UserPlus, X, Mail, ShieldCheck, Clock, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useClinicStore } from '@/stores/clinicStore';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';

interface InviteDoctorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function InviteDoctorModal({ isOpen, onClose }: InviteDoctorModalProps) {
    const { doctors, invites, addDoctor } = useClinicStore();
    const toast = useToast();

    const [inviteStep, setInviteStep] = useState<1 | 2 | 3>(1); // 1: Search, 2: Preview, 3: Success
    const [searchEmail, setSearchEmail] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null);
    const [relationshipStatus, setRelationshipStatus] = useState<'NOT_CONNECTED' | 'INVITATION_PENDING' | 'ACTIVE'>('NOT_CONNECTED');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Terms
    const [practiceType, setPracticeType] = useState('full_time');
    const [consultationModes, setConsultationModes] = useState<string[]>(['in_clinic']);
    const [feeAmount, setFeeAmount] = useState('');
    const [payoutTerms, setPayoutTerms] = useState('');
    const [startDate, setStartDate] = useState('');
    const [scheduleString, setScheduleString] = useState('');

    // Validate email format
    const isValidEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleSearch = async () => {
        const email = searchEmail.trim();
        if (!email) return;

        if (!isValidEmail(email)) {
            toast.error('Invalid Email', 'Please enter a valid email address.');
            return;
        }

        setSearchLoading(true);
        setHasSearched(true);
        setSelectedDoctor(null);

        try {
            const response = await api.clinic.lookupDoctorByEmail(email);
            if (response.success && response.data?.doctor) {
                // Doctor found
                setSelectedDoctor(response.data.doctor);
                setRelationshipStatus(response.data.relationship || 'NOT_CONNECTED');
                setInviteStep(2);
            } else {
                // Not found
                setSelectedDoctor(null);
                setRelationshipStatus('NOT_CONNECTED');
            }
        } catch (error) {
            console.error('Error looking up doctor:', error);
            setSelectedDoctor(null);
            setRelationshipStatus('NOT_CONNECTED');
        } finally {
            setSearchLoading(false);
        }
    };



    const handleSendInvite = async () => {
        if (!selectedDoctor?.id || relationshipStatus !== 'NOT_CONNECTED') {
            toast.error('Error', 'Invalid action.');
            return;
        }
        setActionLoading('invite');
        const success = await addDoctor({ 
            doctorId: selectedDoctor.id,
            practiceType,
            consultationModes,
            feeAmount: feeAmount ? Number(feeAmount) : null,
            payoutTerms,
            startDate: startDate || null,
            schedule: scheduleString ? { description: scheduleString } : {}
        });
        if (success) {
            setInviteStep(3); // Success Screen
            // Note: Ideally refresh clinic store here, handled by store usually.
        } else {
            toast.error('Unable to send invite', useClinicStore.getState().error || 'They may already be invited or affiliated.');
            // Refresh relationship status in case it was a race condition
            handleSearch();
        }
        setActionLoading(null);
    };

    const handleSendPlatformInvite = async () => {
        const email = searchEmail.trim();
        setActionLoading('platform_invite');
        try {
            const response = await api.clinic.sendPlatformInvite(email);
            if (response.success) {
                toast.success('Invitation Sent', `An invitation has been sent to ${email} to join Vaididea.`);
                setInviteStep(3); // Success Screen
            } else {
                toast.error('Unable to send invite', response.error || 'Please try again later.');
            }
        } catch (error) {
            toast.error('Error', 'A network error occurred.');
        }
        setActionLoading(null);
    };

    const handleClose = () => {
        onClose();
        setTimeout(() => {
            setInviteStep(1);
            setSearchEmail('');
            setHasSearched(false);
            setSelectedDoctor(null);
        }, 200);
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity" onClick={handleClose} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-pink-100 dark:bg-pink-500/20 flex items-center justify-center">
                            <UserPlus className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white text-lg">Invite Doctor</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Invite a doctor you already know on Vaididea.</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto min-h-[250px]">
                    {inviteStep === 1 && (
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    Doctor's Vaididea Email
                                </label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            type="email"
                                            autoFocus
                                            placeholder="doctor@example.com"
                                            value={searchEmail}
                                            onChange={(e) => setSearchEmail(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                            className="w-full pl-9 pr-4 py-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all shadow-sm"
                                        />
                                    </div>
                                    <Button 
                                        onClick={handleSearch} 
                                        disabled={!searchEmail.trim() || searchLoading}
                                        className="rounded-xl px-6"
                                        leftIcon={searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                    >
                                        Find Doctor
                                    </Button>
                                </div>
                            </div>

                            {!selectedDoctor && hasSearched && !searchLoading && (
                                <div className="text-center py-8 animate-in fade-in duration-300 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                    <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Doctor account not available yet.</p>
                                    <p className="text-xs text-gray-500 mt-1 max-w-[250px] mx-auto mb-4">You can invite them to join Vaididea and your clinic in one step.</p>
                                    <Button 
                                        variant="outline" 
                                        onClick={() => void handleSendPlatformInvite()}
                                        disabled={actionLoading === 'platform_invite'}
                                        leftIcon={actionLoading === 'platform_invite' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                                    >
                                        Invite to Join Vaididea
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {inviteStep === 2 && selectedDoctor && (() => {
                        return (
                            <div className="space-y-6 animate-in slide-in-from-right-4">
                                <button 
                                    onClick={() => setInviteStep(1)}
                                    className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 flex items-center gap-1"
                                >
                                    &larr; Back to search
                                </button>

                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 text-center relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-16 bg-gradient-to-r from-pink-500/20 to-purple-500/20 dark:from-pink-500/10 dark:to-purple-500/10" />
                                    
                                    {selectedDoctor.profile_image_url ? (
                                        <img src={selectedDoctor.profile_image_url} alt={selectedDoctor.name} className="h-20 w-20 rounded-full object-cover border-4 border-white dark:border-gray-900 shadow-sm mx-auto relative z-10" />
                                    ) : (
                                        <div className="h-20 w-20 rounded-full bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-400 flex items-center justify-center font-bold text-2xl border-4 border-white dark:border-gray-900 shadow-sm mx-auto relative z-10">
                                            {selectedDoctor.name.charAt(0)}
                                        </div>
                                    )}
                                    
                                    <div className="mt-3 flex items-center justify-center gap-2">
                                        <h4 className="font-bold text-lg text-gray-900 dark:text-white">Dr. {selectedDoctor.name}</h4>
                                        {selectedDoctor.verification === 'verified' && <ShieldCheck className="h-4 w-4 text-emerald-500" />}
                                    </div>
                                    <p className="text-sm font-medium text-pink-600 dark:text-pink-400 mb-4">{selectedDoctor.specialization || 'General Practice'}</p>
                                    
                                    <div className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-300">
                                        <div className="flex items-center justify-center gap-2">
                                            <Mail className="h-4 w-4 text-gray-400" />
                                            <span>{searchEmail.trim().toLowerCase()}</span>
                                        </div>
                                        {selectedDoctor.experience_years && (
                                            <div className="flex items-center justify-center gap-2">
                                                <Clock className="h-4 w-4 text-gray-400" />
                                                <span>{selectedDoctor.experience_years} years experience</span>
                                            </div>
                                        )}
                                        {selectedDoctor.verification === 'verified' && (
                                            <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                                                <BadgeCheck className="h-4 w-4" />
                                                <span>Verified Doctor</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {relationshipStatus === 'NOT_CONNECTED' ? (
                                    <>
                                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-lg p-4 flex gap-3 text-sm text-amber-800 dark:text-amber-300">
                                        <AlertCircle className="h-5 w-5 shrink-0" />
                                        <div>
                                            <p className="font-semibold mb-1">✓ Vaididea Doctor Found</p>
                                            <p className="opacity-90 leading-relaxed">Send an affiliation request to invite them to your clinic roster.</p>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4 mt-6 text-left">
                                        <h4 className="font-semibold text-gray-900 dark:text-white border-b pb-2">Proposed Terms</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Practice Type</label>
                                                <select value={practiceType} onChange={e => setPracticeType(e.target.value)} className="w-full text-sm rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 focus:ring-2 focus:ring-pink-500 outline-none">
                                                    <option value="full_time">Full Time</option>
                                                    <option value="part_time">Part Time</option>
                                                    <option value="visiting">Visiting</option>
                                                    <option value="contract">Contract</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Consultation Modes</label>
                                                <select multiple value={consultationModes} onChange={e => setConsultationModes(Array.from(e.target.selectedOptions, option => option.value))} className="w-full text-sm rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 focus:ring-2 focus:ring-pink-500 outline-none h-[42px] overflow-hidden">
                                                    <option value="in_clinic">In-Clinic</option>
                                                    <option value="video">Video</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Fee Amount / Share (₹)</label>
                                                <input type="number" placeholder="e.g. 500" value={feeAmount} onChange={e => setFeeAmount(e.target.value)} className="w-full text-sm rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 focus:ring-2 focus:ring-pink-500 outline-none" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Proposed Start Date</label>
                                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full text-sm rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 focus:ring-2 focus:ring-pink-500 outline-none" />
                                            </div>
                                            <div className="space-y-1 col-span-2">
                                                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Payout Terms (Optional)</label>
                                                <input type="text" placeholder="e.g. 70/30 split, monthly payout" value={payoutTerms} onChange={e => setPayoutTerms(e.target.value)} className="w-full text-sm rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 focus:ring-2 focus:ring-pink-500 outline-none" />
                                            </div>
                                            <div className="space-y-1 col-span-2">
                                                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Proposed Schedule</label>
                                                <input type="text" placeholder="e.g. Mon-Wed-Fri, 10am - 2pm" value={scheduleString} onChange={e => setScheduleString(e.target.value)} className="w-full text-sm rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 focus:ring-2 focus:ring-pink-500 outline-none" />
                                            </div>
                                        </div>
                                    </div>
                                    </>
                                ) : relationshipStatus === 'ACTIVE' ? (
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/50 rounded-lg p-4 flex gap-3 text-sm text-emerald-800 dark:text-emerald-300 items-center justify-center">
                                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                                        <div>
                                            <p className="font-semibold mb-1">✓ Already Affiliated</p>
                                            <p className="opacity-90 leading-relaxed">This doctor is already part of your clinic.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-900/50 rounded-lg p-4 flex gap-3 text-sm text-indigo-800 dark:text-indigo-300 items-center justify-center">
                                        <Clock className="h-5 w-5 shrink-0" />
                                        <div>
                                            <p className="font-semibold mb-1">Invitation Pending</p>
                                            <p className="opacity-90 leading-relaxed">An invitation has already been sent to this doctor.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {inviteStep === 3 && (
                        <div className="py-8 px-4 text-center animate-in zoom-in duration-300">
                            <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Invitation Sent!</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-[280px] mx-auto">
                                {selectedDoctor 
                                    ? `Dr. ${selectedDoctor.name} has been invited to join your clinic. They will appear in your roster once they accept.` 
                                    : `An invitation has been sent to ${searchEmail.trim()}. They will appear in your roster once they create an account and accept.`}
                            </p>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                {inviteStep === 2 && selectedDoctor && (
                    <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
                        {relationshipStatus === 'NOT_CONNECTED' ? (
                            <>
                                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                                <Button 
                                    onClick={() => void handleSendInvite()} 
                                    disabled={actionLoading === 'invite'} 
                                    leftIcon={actionLoading === 'invite' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                                >
                                    Send Clinic Invitation
                                </Button>
                            </>
                        ) : relationshipStatus === 'ACTIVE' ? (
                            <>
                                <Button variant="outline" onClick={handleClose}>Close</Button>
                                <Link href={`/doctors/${selectedDoctor.id}`} onClick={handleClose}>
                                    <Button>View Doctor</Button>
                                </Link>
                            </>
                        ) : (
                            <Button onClick={handleClose}>Close</Button>
                        )}
                    </div>
                )}
                {inviteStep === 3 && (
                    <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-end">
                        <Button onClick={handleClose}>Done</Button>
                    </div>
                )}
            </div>
        </>
    );
}
