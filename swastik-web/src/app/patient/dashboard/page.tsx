'use client';

import React, { useEffect, useState } from 'react';
import { appointmentsApi } from '@/lib/api';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { CalendarDays, Clock, Video, Building2, ExternalLink, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

export default function PatientDashboard() {
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        async function loadAppointments() {
            try {
                const res = await appointmentsApi.getAll();
                if (res.success) {
                    setAppointments(res.data as any[]);
                }
            } catch (error) {
                console.error("Failed to load appointments:", error);
            } finally {
                setLoading(false);
            }
        }
        loadAppointments();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'scheduled':
            case 'confirmed': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'completed': return 'bg-green-100 text-green-700 border-green-200';
            case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
            case 'in_progress': return 'bg-vd-orange/20 text-vd-orange border-vd-orange/30';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="min-h-screen bg-vd-cream flex flex-col">
            <Navbar />
            
            <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-vd-blue">My Dashboard</h1>
                    <p className="text-gray-600 mt-2">Manage your appointments, consultations, and prescriptions.</p>
                </div>

                <div className="bg-white rounded-3xl p-8 shadow-sm border border-vd-beige">
                    <h2 className="text-xl font-bold text-vd-blue mb-6 flex items-center gap-2">
                        <CalendarDays className="w-5 h-5 text-vd-orange" />
                        Upcoming & Past Appointments
                    </h2>

                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-vd-orange" />
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
                                        <h3 className="text-lg font-bold text-vd-blue truncate" title={`Dr. ${apt.doctor?.name || 'Unknown'}`}>
                                            Dr. {apt.doctor?.name || 'Unknown'}
                                        </h3>
                                        <p className="text-sm text-gray-500 truncate">{apt.doctor?.specialization || 'General Physician'}</p>
                                    </div>
                                    
                                    <div className="bg-white p-3 rounded-xl border border-gray-100 mb-4 space-y-2">
                                        <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                                            <CalendarDays className="w-4 h-4 text-vd-orange" />
                                            {new Date(apt.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                                            <Clock className="w-4 h-4 text-vd-orange" />
                                            {apt.time_slot}
                                        </div>
                                    </div>

                                    {/* Action Buttons based on status */}
                                    <div className="mt-auto pt-2 space-y-2">
                                        {apt.type === 'video' && (apt.status === 'confirmed' || apt.status === 'in_progress') && (
                                            <Button 
                                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                                onClick={() => router.push(`/consultation/${apt.id}/join`)}
                                            >
                                                <Video className="w-4 h-4 mr-2" /> Join Video Call
                                            </Button>
                                        )}
                                        {apt.status === 'completed' && (
                                            <Button 
                                                variant="outline"
                                                className="w-full border-vd-orange text-vd-orange hover:bg-vd-orange/10"
                                                onClick={() => window.open(`/api/prescriptions/${apt.id}/pdf`, '_blank')}
                                            >
                                                <FileText className="w-4 h-4 mr-2" /> View Prescription
                                            </Button>
                                        )}
                                        {(apt.status === 'pending' || apt.status === 'scheduled') && (
                                            <Button variant="outline" className="w-full text-gray-600 hover:text-red-600 hover:bg-red-50">
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
                            <Button className="bg-vd-orange text-white" onClick={() => router.push('/')}>
                                Find a Doctor
                            </Button>
                        </div>
                    )}
                </div>
            </main>
            
            <Footer />
        </div>
    );
}
