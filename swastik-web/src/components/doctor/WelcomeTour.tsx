'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Calendar, Users, Settings, X, Activity } from 'lucide-react';
import { useDoctorStore } from '@/stores/doctorStore';

export function WelcomeTour() {
    const { doctorProfile } = useDoctorStore();
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState(1);

    useEffect(() => {
        // Only show if approved and hasn't seen the tour yet
        if (doctorProfile?.approval_status === 'approved') {
            const hasSeenTour = localStorage.getItem('has_seen_tour');
            if (!hasSeenTour) {
                setIsOpen(true);
            }
        }
    }, [doctorProfile]);

    if (!isOpen) return null;

    const closeTour = () => {
        localStorage.setItem('has_seen_tour', 'true');
        setIsOpen(false);
    };

    const steps = [
        {
            title: "Welcome to your Vaididea Dashboard!",
            description: "Your profile is fully verified and you are now ready to accept patients. Let's take a quick look around.",
            icon: <Activity className="h-12 w-12 text-emerald-500 mb-4" />
        },
        {
            title: "Manage Appointments",
            description: "View and manage all your upcoming Video, Clinic, and Home Visit consultations in one place.",
            icon: <Users className="h-12 w-12 text-emerald-500 mb-4" />
        },
        {
            title: "Setup Your Schedule",
            description: "Don't forget to head over to the 'Schedule' tab to define your weekly availability and slot durations.",
            icon: <Calendar className="h-12 w-12 text-emerald-500 mb-4" />
        },
        {
            title: "Customize Your Profile",
            description: "Keep your profile 100% complete with a professional photo, updated fees, and your digital signature.",
            icon: <Settings className="h-12 w-12 text-emerald-500 mb-4" />
        }
    ];

    const current = steps[step - 1];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-lg bg-white overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-end p-2">
                    <button onClick={closeTour} className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                
                <div className="px-8 pb-8 text-center flex flex-col items-center">
                    {current.icon}
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">{current.title}</h2>
                    <p className="text-gray-600 mb-8 leading-relaxed">
                        {current.description}
                    </p>

                    <div className="flex items-center justify-between w-full mt-4">
                        <div className="flex gap-2">
                            {steps.map((_, idx) => (
                                <div 
                                    key={idx} 
                                    className={`h-2 rounded-full transition-all duration-300 ${idx + 1 === step ? 'w-6 bg-emerald-500' : 'w-2 bg-gray-200'}`}
                                />
                            ))}
                        </div>
                        
                        <div className="flex gap-3">
                            {step < steps.length ? (
                                <Button onClick={() => setStep(s => s + 1)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 rounded-full">
                                    Next
                                </Button>
                            ) : (
                                <Button onClick={closeTour} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 rounded-full">
                                    Get Started
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
