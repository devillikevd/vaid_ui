'use client';

import React, { useEffect, useState } from 'react';
import { appointmentsApi, reviewsApi } from '@/lib/api';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { 
    CalendarDays, Clock, Video, Building2, Loader2, FileText,
    Star, MessageSquare, Pill, FlaskConical, Stethoscope, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import ReviewSubmissionModal from '@/components/shared/ReviewSubmissionModal';
import PlatformFeedbackModal from '@/components/shared/PlatformFeedbackModal';

export default function PatientDashboard() {
    const [appointments, setAppointments] = useState<any[]>([]);
    const [pendingReviews, setPendingReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [reviewModalTarget, setReviewModalTarget] = useState<any | null>(null);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const router = useRouter();

    const loadData = async () => {
        setLoading(true);
        try {
            const [aptRes, pendingRes] = await Promise.allSettled([
                appointmentsApi.getAll(),
                reviewsApi.getPending()
            ]);

            if (aptRes.status === 'fulfilled' && aptRes.value.success) {
                setAppointments(aptRes.value.data as any[]);
            }
            if (pendingRes.status === 'fulfilled' && pendingRes.value.success) {
                setPendingReviews((pendingRes.value.data as any[]) || []);
            }
        } catch (error) {
            console.error("Failed to load dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'scheduled':
            case 'confirmed': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'completed': return 'bg-green-100 text-green-700 border-green-200';
            case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
            case 'in_progress': return 'bg-orange-100 text-orange-700 border-orange-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getTargetIcon = (type: string) => {
        switch (type) {
            case 'doctor': return <Stethoscope className="w-5 h-5 text-emerald-600" />;
            case 'pharmacy': return <Pill className="w-5 h-5 text-orange-600" />;
            case 'diagnostic_center': return <FlaskConical className="w-5 h-5 text-teal-600" />;
            case 'hospital': return <Building2 className="w-5 h-5 text-blue-600" />;
            case 'clinic': return <Building2 className="w-5 h-5 text-pink-600" />;
            default: return <Star className="w-5 h-5 text-amber-500" />;
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFBF7] flex flex-col">
            <Navbar />
            
            <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
                {/* Dashboard Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-[#1F2B5B]">My Health Dashboard</h1>
                        <p className="text-gray-600 mt-1">Manage your appointments, verified care reviews, and platform feedback.</p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => setIsFeedbackModalOpen(true)}
                        className="rounded-2xl border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold shadow-sm"
                    >
                        <MessageSquare className="w-4 h-4 mr-2 text-[#1F2B5B]" /> Give Platform Feedback
                    </Button>
                </div>

                {/* Pending Care Reviews Section */}
                {pendingReviews.length > 0 && (
                    <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 rounded-3xl p-6 sm:p-8 border border-amber-200/60 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-black text-amber-950 flex items-center gap-2">
                                    <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                                    Completed Services Awaiting Your Review ({pendingReviews.length})
                                </h2>
                                <p className="text-xs text-amber-800/80 mt-0.5">
                                    Your verified feedback helps providers improve and guides fellow patients in your community.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {pendingReviews.map((item, idx) => (
                                <div 
                                    key={idx} 
                                    className="bg-white rounded-2xl p-5 border border-amber-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all"
                                >
                                    <div className="flex items-start gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                                            {getTargetIcon(item.targetType)}
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                                                {item.targetType.replace('_', ' ')}
                                            </span>
                                            <h4 className="font-extrabold text-gray-900 text-sm mt-1">
                                                {item.targetName}
                                            </h4>
                                            <p className="text-xs text-gray-500">
                                                Completed: {new Date(item.completedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    <Button
                                        size="sm"
                                        onClick={() => setReviewModalTarget({
                                            type: item.targetType,
                                            id: item.targetId,
                                            name: item.targetName,
                                            sourceType: item.sourceType,
                                            sourceId: item.sourceId,
                                            consultationId: item.sourceType === 'consultation' ? item.sourceId : undefined
                                        })}
                                        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs"
                                    >
                                        <Star className="w-3.5 h-3.5 mr-1.5 fill-white" /> Rate & Review Experience
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Appointments Section */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#F3EFE6]">
                    <h2 className="text-xl font-bold text-[#1F2B5B] mb-6 flex items-center gap-2">
                        <CalendarDays className="w-5 h-5 text-orange-500" />
                        Appointments & Consultations
                    </h2>

                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                        </div>
                    ) : appointments.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {appointments.map((apt: any) => (
                                <div key={apt.id} className="border border-gray-100 rounded-2xl p-5 hover:shadow-md transition-all bg-gray-50/50 flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getStatusColor(apt.status)}`}>
                                                {apt.status.replace('_', ' ').toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-500 bg-white px-2 py-1 rounded-lg border border-gray-100 shadow-sm">
                                            {apt.type === 'video' ? <Video className="w-4 h-4 text-blue-500" /> : <Building2 className="w-4 h-4 text-emerald-500" />}
                                            <span className="capitalize">{apt.type}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="mb-4 flex-1">
                                        <h3 className="text-lg font-bold text-[#1F2B5B] truncate" title={`Dr. ${apt.doctor?.name || 'Unknown'}`}>
                                            Dr. {apt.doctor?.name || 'Unknown'}
                                        </h3>
                                        <p className="text-sm text-gray-500 truncate">{apt.doctor?.specialization || 'General Physician'}</p>
                                    </div>
                                    
                                    <div className="bg-white p-3 rounded-xl border border-gray-100 mb-4 space-y-2">
                                        <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                                            <CalendarDays className="w-4 h-4 text-orange-500" />
                                            {new Date(apt.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                                            <Clock className="w-4 h-4 text-orange-500" />
                                            {apt.time_slot}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="mt-auto pt-2 space-y-2">
                                        {apt.type === 'video' && (apt.status === 'confirmed' || apt.status === 'in_progress') && (
                                            <Button 
                                                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                                                onClick={() => router.push(`/consultation/${apt.id}/join`)}
                                            >
                                                <Video className="w-4 h-4 mr-2" /> Join Video Call
                                            </Button>
                                        )}
                                        {apt.status === 'completed' && (
                                            <div className="flex gap-2">
                                                <Button 
                                                    variant="outline"
                                                    className="flex-1 border-orange-300 text-orange-600 hover:bg-orange-50 rounded-xl text-xs"
                                                    onClick={() => window.open(`/api/prescriptions/${apt.id}/pdf`, '_blank')}
                                                >
                                                    <FileText className="w-3.5 h-3.5 mr-1" /> Prescription
                                                </Button>
                                                <Button 
                                                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold"
                                                    onClick={() => setReviewModalTarget({
                                                        type: 'doctor',
                                                        id: apt.doctor_id || apt.doctor?.id,
                                                        name: `Dr. ${apt.doctor?.name || 'Doctor'}`,
                                                        sourceType: 'appointment',
                                                        sourceId: apt.id,
                                                        consultationId: apt.consultation_id || undefined
                                                    })}
                                                >
                                                    <Star className="w-3.5 h-3.5 mr-1 fill-white" /> Review
                                                </Button>
                                            </div>
                                        )}
                                        {(apt.status === 'pending' || apt.status === 'scheduled') && (
                                            <Button variant="outline" className="w-full text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl">
                                                Cancel Booking
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-100">
                            <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-gray-600 mb-2">No appointments yet</h3>
                            <p className="text-gray-500 mb-6">You haven&apos;t booked any consultations.</p>
                            <Button className="bg-orange-500 text-white rounded-xl" onClick={() => router.push('/')}>
                                Find a Doctor
                            </Button>
                        </div>
                    )}
                </div>
            </main>

            {/* Review Submission Modal */}
            {reviewModalTarget && (
                <ReviewSubmissionModal
                    isOpen={Boolean(reviewModalTarget)}
                    onClose={() => setReviewModalTarget(null)}
                    onSuccess={() => loadData()}
                    target={reviewModalTarget}
                />
            )}

            {/* Platform Feedback Modal */}
            <PlatformFeedbackModal
                isOpen={isFeedbackModalOpen}
                onClose={() => setIsFeedbackModalOpen(false)}
                pageName="Patient Dashboard"
            />
            
            <Footer />
        </div>
    );
}
