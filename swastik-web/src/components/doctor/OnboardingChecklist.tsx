'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { CheckCircle2, Circle, ChevronRight } from 'lucide-react';
import { DoctorProfile } from '@/stores/doctorStore';
import Link from 'next/link';

interface OnboardingChecklistProps {
    profile: DoctorProfile;
}

export function OnboardingChecklist({ profile }: OnboardingChecklistProps) {
    const completion = profile.profile_completion_percentage || 0;

    const tasks = [
        {
            id: 'photo',
            label: 'Upload Profile Photo',
            isComplete: !!profile.profile_image_url,
            href: '/doctor/settings',
        },
        {
            id: 'fees',
            label: 'Setup Consultation Fees',
            isComplete: profile.consultation_fee! > 0 || profile.video_consultation_fee! > 0,
            href: '/doctor/settings',
        },
        {
            id: 'availability',
            label: 'Add Weekly Availability',
            isComplete: false, // We don't have schedule integrated in profile directly yet, but assuming false until fetched
            href: '/doctor/schedule',
        },
        {
            id: 'intro_video',
            label: 'Upload Intro Video (Optional)',
            isComplete: !!profile.intro_video_url,
            href: '/doctor/settings',
        }
    ];

    if (completion === 100) return null;

    return (
        <Card className="border-gray-200 shadow-sm mb-6">
            <CardHeader className="bg-gray-50 border-b border-gray-100 pb-4">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-gray-800 text-base">Profile Completion: {completion}%</CardTitle>
                    <div className="w-1/3 bg-gray-200 rounded-full h-2">
                        <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${completion}%` }} />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-4 p-0">
                <div className="divide-y divide-gray-100">
                    {tasks.map(task => (
                        <Link 
                            key={task.id} 
                            href={task.href}
                            className={`flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${task.isComplete ? 'opacity-60' : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                {task.isComplete ? <CheckCircle2 className="text-emerald-500 h-5 w-5" /> : <Circle className="text-gray-300 h-5 w-5" />}
                                <span className={`text-sm ${task.isComplete ? 'text-gray-500 line-through' : 'text-gray-900 font-medium'}`}>{task.label}</span>
                            </div>
                            {!task.isComplete && <ChevronRight className="text-gray-400 h-4 w-4" />}
                        </Link>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
