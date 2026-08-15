'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, AlertCircle, ChevronRight, CheckCircle2, UserPlus, X, Mail, ShieldCheck, Clock, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useClinicStore } from '@/stores/clinicStore';
import { useToast } from '@/components/ui/Toast';
import { fetchWithAuth } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';

interface InviteDoctorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function InviteDoctorModal({ isOpen, onClose }: InviteDoctorModalProps) {
    const { doctors, invites, addDoctor } = useClinicStore();
    const toast = useToast();

    const [inviteStep, setInviteStep] = useState<1 | 2 | 3>(1); // 1: Search, 2: Preview, 3: Success
    const [doctorSearchQuery, setDoctorSearchQuery] = useState('');
    const debouncedDoctorSearch = useDebounce(doctorSearchQuery, 500);
    const [searchingDoctors, setSearchingDoctors] = useState(false);
    const [searchedDoctors, setSearchedDoctors] = useState<any[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Search Flow
    useEffect(() => {
        const runSearch = async () => {
            const query = debouncedDoctorSearch.trim();
            if (!query) {
                setSearchedDoctors([]);
                setHasSearched(false);
                return;
            }
            setSearchingDoctors(true);
            try {
                const data = await fetchWithAuth<any[]>(`/doctors?search=${encodeURIComponent(query)}&limit=10&global=true`);
                if (data.success) {
                    setSearchedDoctors(data.data || []);
                    setHasSearched(true);
                }
            } catch (error) {
                console.error('Error searching doctors:', error);
            } finally {
                setSearchingDoctors(false);
            }
        };
        if (isOpen) {
            void runSearch();
        }
    }, [debouncedDoctorSearch, isOpen]);

    const handleSelectDoctor = (doctor: any) => {
        setSelectedDoctor(doctor);
        setInviteStep(2);
    };

    const getRelationStatus = (doctorId: string): 'NOT_CONNECTED' | 'INVITATION_PENDING' | 'ACTIVE' => {
        if (doctors.some(d => d.id === doctorId || d.doctorId === doctorId)) return 'ACTIVE';
        if (invites.some(i => i.doctor.id === doctorId && i.status === 'pending')) return 'INVITATION_PENDING';
        return 'NOT_CONNECTED';
    };

    const handleSendInvite = async () => {
        if (!selectedDoctor?.id) {
            toast.error('Error', 'Selected doctor is invalid.');
            return;
        }
        setActionLoading('invite');
        const success = await addDoctor({ doctorId: selectedDoctor.id });
        if (success) {
            setInviteStep(3); // Success Screen
        } else {
            toast.error('Unable to send invite', useClinicStore.getState().error || 'They may already be invited or affiliated.');
        }
        setActionLoading(null);
    };

    const handleClose = () => {
        onClose();
        setTimeout(() => {
            setInviteStep(1);
            setDoctorSearchQuery('');
            setSearchedDoctors([]);
            setHasSearched(false);
            setSelectedDoctor(null);
        }, 200);
    };

    if (!isOpen) return null;

    const isEmailSearch = doctorSearchQuery.includes('@');

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
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Add a doctor to your clinic roster</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto min-h-[300px]">
                    {inviteStep === 1 && (
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    Search Vaididea Network
                                </label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        autoFocus
                                        placeholder="Search by doctor name, email, or specialty..."
                                        value={doctorSearchQuery}
                                        onChange={(e) => setDoctorSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-10 py-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all shadow-sm"
                                    />
                                    {searchingDoctors && (
                                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pink-500 animate-spin" />
                                    )}
                                </div>
                            </div>

                            {searchedDoctors.length > 0 && (
                                <div className="space-y-3 animate-in fade-in duration-300">
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Search Results</h4>
                                    <div className="space-y-2">
                                        {searchedDoctors.map(doctor => {
                                            const status = getRelationStatus(doctor.id);
                                            return (
                                                <div 
                                                    key={doctor.id}
                                                    onClick={() => handleSelectDoctor(doctor)}
                                                    className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-pink-300 dark:hover:border-pink-700/50 hover:bg-pink-50 dark:hover:bg-pink-900/10 cursor-pointer transition-all group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {doctor.profile_image_url ? (
                                                            <img src={doctor.profile_image_url} alt={doctor.name} className="h-10 w-10 rounded-full object-cover" />
                                                        ) : (
                                                            <div className="h-10 w-10 rounded-full bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-400 flex items-center justify-center font-bold">
                                                                {doctor.name.charAt(0)}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                                                                Dr. {doctor.name}
                                                                {doctor.verification === 'verified' && <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />}
                                                            </p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">{doctor.specialization || 'General Practice'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {status === 'ACTIVE' && <StatusBadge status="active" size="sm" />}
                                                        {status === 'INVITATION_PENDING' && <StatusBadge status="pending" size="sm" />}
                                                        {status === 'NOT_CONNECTED' && <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-pink-500 transition-colors" />}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {searchedDoctors.length === 0 && hasSearched && !searchingDoctors && (
                                <div className="text-center py-8 animate-in fade-in duration-300 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                    <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                    {isEmailSearch ? (
                                        <>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No Vaididea doctor account found with this email.</p>
                                            <p className="text-xs text-gray-500 mt-1 max-w-[250px] mx-auto">Only registered Vaididea doctors can be invited. Ask the doctor to create an account first.</p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No doctors found</p>
                                            <p className="text-xs text-gray-500 mt-1">Try adjusting your search criteria.</p>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {inviteStep === 2 && selectedDoctor && (() => {
                        const status = getRelationStatus(selectedDoctor.id);
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
                                    
                                    <h4 className="font-bold text-lg text-gray-900 dark:text-white mt-3">Dr. {selectedDoctor.name}</h4>
                                    <p className="text-sm font-medium text-pink-600 dark:text-pink-400 mb-4">{selectedDoctor.specialization || 'General Practice'}</p>
                                    
                                    <div className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-300">
                                        <div className="flex items-center justify-center gap-2">
                                            <Mail className="h-4 w-4 text-gray-400" />
                                            <span>{selectedDoctor.email || 'Email hidden'}</span>
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

                                {status === 'NOT_CONNECTED' ? (
                                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-lg p-4 flex gap-3 text-sm text-amber-800 dark:text-amber-300">
                                        <AlertCircle className="h-5 w-5 shrink-0" />
                                        <div>
                                            <p className="font-semibold mb-1">Send affiliation request?</p>
                                            <p className="opacity-90 leading-relaxed">Dr. {selectedDoctor.name} will receive a notification to join your clinic. Once accepted, they will appear in your roster and can be scheduled for in-person consultations.</p>
                                        </div>
                                    </div>
                                ) : status === 'ACTIVE' ? (
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/50 rounded-lg p-4 flex gap-3 text-sm text-emerald-800 dark:text-emerald-300 items-center justify-center">
                                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                                        <span className="font-semibold">✓ Active Doctor - Dr. {selectedDoctor.name} is already part of your clinic.</span>
                                    </div>
                                ) : (
                                    <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-900/50 rounded-lg p-4 flex gap-3 text-sm text-indigo-800 dark:text-indigo-300 items-center justify-center">
                                        <Clock className="h-5 w-5 shrink-0" />
                                        <span className="font-semibold">Invitation Pending - An invitation has already been sent.</span>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {inviteStep === 3 && selectedDoctor && (
                        <div className="py-8 px-4 text-center animate-in zoom-in duration-300">
                            <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Invitation Sent!</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-[280px] mx-auto">
                                Dr. {selectedDoctor.name} has been invited to join your clinic. They will appear in your roster once they accept.
                            </p>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                {inviteStep === 2 && selectedDoctor && (
                    <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
                        {getRelationStatus(selectedDoctor.id) === 'NOT_CONNECTED' ? (
                            <>
                                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                                <Button 
                                    onClick={() => void handleSendInvite()} 
                                    disabled={actionLoading === 'invite'} 
                                    leftIcon={actionLoading === 'invite' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                                >
                                    Invite to Clinic
                                </Button>
                            </>
                        ) : (
                            <Button onClick={handleClose}>Done</Button>
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
