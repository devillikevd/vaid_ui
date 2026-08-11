'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, Circle, AlertCircle, Eye, UploadCloud, ShieldAlert, FileText, Check } from 'lucide-react';
import { DoctorProfile, useDoctorStore } from '@/stores/doctorStore';

interface VerificationProgressCardProps {
    profile: DoctorProfile;
}

export function VerificationProgressCard({ profile }: VerificationProgressCardProps) {
    const { fetchDoctorProfile } = useDoctorStore();
    const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

    // Calculate granular verification steps
    const verifications = [
        { id: 'email', label: 'Email Verified', isComplete: profile.user?.is_verified ?? false },
        { id: 'identity', label: 'Identity Verified', isComplete: !!profile.government_id_url && !!profile.live_selfie_url },
        { id: 'degree', label: 'Degree Verified', isComplete: !!profile.degree_certificate_url },
        { id: 'council', label: 'Council Verified', isComplete: !!profile.license_document_url || !!profile.registration_number },
        { id: 'bank', label: 'Bank Verified', isComplete: !!profile.bank_penny_verified },
        { id: 'clinic', label: 'Clinic Verified', isComplete: !!profile.clinic_license_url || !!profile.hospital_id },
    ];

    const completedCount = verifications.filter(v => v.isComplete).length;
    const progressPercent = Math.round((completedCount / verifications.length) * 100);

    // Timeline Steps for the main progress
    const steps = [
        {
            id: 'submitted',
            label: 'Application Submitted',
            isComplete: true, // Always true if they are on this dashboard
            description: 'Profile created.',
        },
        {
            id: 'reviewing',
            label: 'Admin Reviewing',
            isComplete: profile.approval_status === 'under_review' || profile.approval_status === 'approved',
            isPending: profile.approval_status === 'pending',
            description: 'Admin team is reviewing docs.',
        },
        {
            id: 'verifications',
            label: 'Documents Verified',
            isComplete: completedCount === verifications.length,
            isPending: profile.approval_status === 'under_review',
            isRejected: profile.approval_status === 'rejected',
            description: profile.approval_status === 'rejected' ? 'Issues found in documents.' : 'All granular checks passed.',
        },
        {
            id: 'approved',
            label: 'Final Approval',
            isComplete: profile.approval_status === 'approved',
            description: 'You are ready to accept patients.',
        }
    ];

    const handleUploadClick = (uploadKey: string) => {
        setUploadingDoc(uploadKey);
        setTimeout(() => {
            alert(`File upload for ${uploadKey} triggered.`);
            setUploadingDoc(null);
        }, 1000);
    };

    return (
        <Card className="border-emerald-100 shadow-md mb-6 overflow-hidden">
            <CardHeader className="bg-emerald-50/50 border-b border-emerald-100 pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-emerald-800 flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-emerald-600" />
                            Verification Timeline
                        </CardTitle>
                        <p className="text-sm text-emerald-600 mt-1">
                            Track the status of your profile verification.
                        </p>
                    </div>
                    <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-emerald-100 shadow-sm">
                        <div className="text-right">
                            <span className="block text-2xl font-bold text-emerald-600">{progressPercent}%</span>
                            <span className="block text-xs text-emerald-500 uppercase tracking-wider">Overall</span>
                        </div>
                        <div className="h-12 w-12 rounded-full border-4 border-emerald-50 flex items-center justify-center relative bg-emerald-50">
                            <svg className="absolute w-full h-full transform -rotate-90">
                                <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4" className="text-emerald-100" />
                                <circle 
                                    cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4" 
                                    className="text-emerald-500 transition-all duration-1000 ease-out" 
                                    strokeDasharray={`${(progressPercent / 100) * 125.6} 125.6`} 
                                />
                            </svg>
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-6">
                {/* Granular Checks */}
                <div className="mb-8 grid grid-cols-2 md:grid-cols-3 gap-3">
                    {verifications.map(v => (
                        <div key={v.id} className={`flex items-center gap-2 p-2 rounded-lg border ${v.isComplete ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
                            {v.isComplete ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-gray-400" />}
                            <span className={`text-sm font-medium ${v.isComplete ? 'text-emerald-800' : 'text-gray-500'}`}>{v.label}</span>
                        </div>
                    ))}
                </div>

                {/* Main Timeline */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-gray-100">
                    {steps.map((step, idx) => (
                        <div key={step.id} className="relative flex flex-col items-center text-center">
                            {idx !== steps.length - 1 && (
                                <div className="hidden md:block absolute top-4 left-[60%] right-[-40%] h-0.5 bg-gray-200 z-0">
                                    <div className="h-full bg-emerald-500 transition-all" style={{ width: step.isComplete ? '100%' : '0%' }} />
                                </div>
                            )}

                            <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center bg-white border-2 
                                ${step.isComplete ? 'border-emerald-500 text-emerald-500' : 
                                  step.isRejected ? 'border-red-500 text-red-500' : 
                                  step.isPending ? 'border-yellow-500 text-yellow-500' : 
                                  'border-gray-300 text-gray-300'}`}
                            >
                                {step.isComplete ? <CheckCircle2 className="h-5 w-5 fill-emerald-50" /> : 
                                 step.isRejected ? <AlertCircle className="h-5 w-5 fill-red-50" /> :
                                 step.isPending ? <Circle className="h-5 w-5 fill-yellow-50 animate-pulse" /> :
                                 <Circle className="h-5 w-5" />}
                            </div>

                            <div className="mt-3">
                                <h5 className="font-medium text-sm text-gray-900">{step.label}</h5>
                                <p className="text-xs text-gray-500 mt-1 max-w-[150px] mx-auto">{step.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
