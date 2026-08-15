'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { 
    Building2, Hospital, MapPin, Phone, Mail, Globe, 
    Clock, ShieldCheck, Star, Users, Stethoscope, 
    ArrowLeft, ChevronRight, CheckCircle2, Bed, 
    AlertCircle, Loader2, Sparkles, Navigation, Calendar 
} from 'lucide-react';
import { doctorApi } from '@/lib/api';
import JoinRequestModal from '@/components/doctor/JoinRequestModal';
import Link from 'next/link';

export default function OrganizationDetailsPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();

    const organizationId = params?.organizationId as string;
    const typeParam = searchParams?.get('type') || undefined;

    const [organization, setOrganization] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showJoinModal, setShowJoinModal] = useState(false);

    useEffect(() => {
        if (!organizationId) return;

        const loadOrg = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await doctorApi.getOrganizationDetails(organizationId, typeParam);
                if (res.success && res.data) {
                    setOrganization(res.data);
                } else {
                    setError(res.error || 'Failed to load organization details');
                }
            } catch (err: any) {
                setError(err.message || 'Unable to connect to server');
            } finally {
                setIsLoading(false);
            }
        };

        loadOrg();
    }, [organizationId, typeParam]);

    if (isLoading) {
        return (
            <div className="max-w-5xl mx-auto py-24 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading organization profile...</p>
            </div>
        );
    }

    if (error || !organization) {
        return (
            <div className="max-w-3xl mx-auto py-16 px-4 text-center">
                <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-3xl flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Organization Not Found</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{error || 'This organization profile could not be retrieved.'}</p>
                <Link
                    href="/doctor/care-networks/find"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-brand-700 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Search
                </Link>
            </div>
        );
    }

    const isHosp = organization.organization_type === 'hospital' || organization.type === 'hospital';
    const specializations = Array.isArray(organization.specializations) ? organization.specializations : [];
    const facilities = Array.isArray(organization.facilities) ? organization.facilities : [];
    const departments = Array.isArray(organization.departments) ? organization.departments : [];
    const departmentList = Array.isArray(organization.department_list) ? organization.department_list : [];
    const affiliatedDoctors = Array.isArray(organization.doctors) ? organization.doctors : [];
    const ratingVal = typeof organization.rating === 'number' ? organization.rating : parseFloat(organization.rating || '0');

    // Parse opening hours
    let hoursDisplay: string = organization.is_24_hours ? 'Open 24 Hours / 7 Days' : 'Standard Working Hours';
    if (organization.opening_hours) {
        if (typeof organization.opening_hours === 'string') {
            try {
                const parsed = JSON.parse(organization.opening_hours);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    hoursDisplay = `${parsed.length} days operational / week`;
                }
            } catch (e) {
                // ignore
            }
        } else if (typeof organization.opening_hours === 'object' && Object.keys(organization.opening_hours).length > 0) {
            hoursDisplay = 'Scheduled Operating Timings';
        }
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-24 px-4 sm:px-6">
            {/* Top Back Navigation */}
            <div className="flex items-center justify-between pt-2">
                <Link
                    href="/doctor/care-networks/find"
                    className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Organizations
                </Link>
                <button
                    onClick={() => setShowJoinModal(true)}
                    className="sm:hidden px-4 py-2 bg-brand-600 text-white rounded-xl font-bold text-xs shadow-md shadow-brand-600/20"
                >
                    Request to Join
                </button>
            </div>

            {/* Profile Hero Header Card */}
            <div className="bg-white dark:bg-[#0f172a] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                {/* Banner / Cover */}
                <div className="h-32 sm:h-44 w-full bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 relative">
                    <div className="absolute inset-0 bg-black/10" />
                </div>

                <div className="px-6 pb-6 pt-0 relative">
                    {/* Avatar & Main Info */}
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14 mb-6">
                        <div className="flex items-end gap-4">
                            {organization.profile_image_url || organization.image_url ? (
                                <img
                                    src={organization.profile_image_url || organization.image_url}
                                    alt={organization.name}
                                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-4 border-white dark:border-[#0f172a] shadow-lg bg-white dark:bg-gray-800 shrink-0"
                                />
                            ) : (
                                <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-3xl border-4 border-white dark:border-[#0f172a] shadow-lg flex items-center justify-center font-bold text-3xl shrink-0 ${
                                    isHosp
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-emerald-600 text-white'
                                }`}>
                                    {isHosp ? <Hospital className="w-12 h-12" /> : <Building2 className="w-12 h-12" />}
                                </div>
                            )}
                            <div className="space-y-1 mb-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-md uppercase tracking-wider ${
                                        isHosp 
                                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60' 
                                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                                    }`}>
                                        {isHosp ? 'Hospital' : 'Clinic'}
                                    </span>
                                    {organization.approval_status === 'approved' && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified Facility
                                        </span>
                                    )}
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white leading-tight">
                                    {organization.name}
                                </h1>
                            </div>
                        </div>

                        {/* Top CTA */}
                        <div className="hidden sm:flex items-center gap-3">
                            <button
                                onClick={() => setShowJoinModal(true)}
                                className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white rounded-2xl font-bold text-sm transition-all shadow-md shadow-brand-600/20"
                            >
                                <span>Request to Join</span>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Quick Stats Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 text-xs">
                        <div className="bg-gray-50 dark:bg-gray-900/60 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                            <span className="text-gray-400 block mb-0.5">Rating & Reviews</span>
                            <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white text-sm">
                                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                <span>{ratingVal > 0 ? ratingVal.toFixed(1) : 'New'}</span>
                                {organization.total_reviews ? <span className="font-normal text-gray-400 text-xs">({organization.total_reviews})</span> : null}
                            </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-900/60 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                            <span className="text-gray-400 block mb-0.5">Working Hours</span>
                            <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white text-sm truncate">
                                <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                                <span className="truncate">{organization.is_24_hours ? '24/7 Available' : 'Scheduled OPD'}</span>
                            </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-900/60 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                            <span className="text-gray-400 block mb-0.5">Location</span>
                            <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white text-sm truncate">
                                <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span className="truncate">{organization.city || 'City on file'}</span>
                            </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-900/60 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                            <span className="text-gray-400 block mb-0.5">Consultation</span>
                            <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 text-sm truncate">
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                <span>In-Person & Video</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column (2 Cols): About, Departments, Facilities, Doctors */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* 1. Overview & About */}
                    <div className="bg-white dark:bg-[#0f172a] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-3">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-brand-600" /> About {organization.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                            {organization.description || `${organization.name} is a certified ${isHosp ? 'hospital facility' : 'clinical healthcare provider'} dedicated to high quality patient care and multidisciplinary collaborations.`}
                        </p>
                    </div>

                    {/* 2. Departments & Specialties */}
                    {(specializations.length > 0 || departments.length > 0 || departmentList.length > 0) && (
                        <div className="bg-white dark:bg-[#0f172a] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-4">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Stethoscope className="w-4 h-4 text-brand-600" /> Specialties & Departments
                            </h3>

                            {specializations.length > 0 && (
                                <div>
                                    <span className="text-xs font-semibold text-gray-400 block mb-2 uppercase tracking-wider">Clinical Specializations</span>
                                    <div className="flex flex-wrap gap-2">
                                        {specializations.map((s: string, idx: number) => (
                                            <span key={idx} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800/40">
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {(departmentList.length > 0 || departments.length > 0) && (
                                <div className="pt-2">
                                    <span className="text-xs font-semibold text-gray-400 block mb-2 uppercase tracking-wider">Active Departments</span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        {(departmentList.length > 0 ? departmentList : departments.map((d: any) => ({ name: d }))).map((d: any, idx: number) => (
                                            <div key={idx} className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 flex items-center gap-2.5">
                                                <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                                                <div className="min-w-0">
                                                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block truncate">{d.name || d}</span>
                                                    {d.description && <span className="text-[11px] text-gray-400 truncate block">{d.description}</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3. Facilities & Infrastructure */}
                    {facilities.length > 0 && (
                        <div className="bg-white dark:bg-[#0f172a] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-3">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Bed className="w-4 h-4 text-brand-600" /> Infrastructure & Facilities
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                {facilities.map((f: string, idx: number) => (
                                    <div key={idx} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                        <span className="truncate">{f}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 4. Affiliated Medical Team / Doctors */}
                    {affiliatedDoctors.length > 0 && (
                        <div className="bg-white dark:bg-[#0f172a] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-4">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Users className="w-4 h-4 text-brand-600" /> Current Medical Roster
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {affiliatedDoctors.map((doc: any, idx: number) => (
                                    <div key={idx} className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 flex items-center gap-3">
                                        {doc.profile_image_url ? (
                                            <img src={doc.profile_image_url} alt={doc.name} className="w-10 h-10 rounded-xl object-cover border border-gray-200 dark:border-gray-700" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold text-sm">
                                                {doc.name ? doc.name.charAt(0) : 'D'}
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <span className="text-xs font-bold text-gray-900 dark:text-white block truncate">Dr. {doc.name}</span>
                                            <span className="text-[11px] text-gray-500 dark:text-gray-400 block truncate">{doc.specialization || doc.role || 'Consultant'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column (1 Col): Location, Contact, Practice Opportunities */}
                <div className="space-y-6">
                    
                    {/* Practice Opportunities Card */}
                    <div className="bg-gradient-to-br from-brand-50 to-indigo-50 dark:from-brand-950/30 dark:to-indigo-950/20 rounded-3xl p-6 border border-brand-100 dark:border-brand-900/40 space-y-4">
                        <h3 className="text-base font-bold text-brand-950 dark:text-brand-100">
                            Partner with {organization.name}
                        </h3>
                        <p className="text-xs text-brand-800 dark:text-brand-300/90 leading-relaxed">
                            Send your practice availability, preferred consultation modes, and compensation terms to begin in-person or video consultations under this network.
                        </p>
                        <button
                            onClick={() => setShowJoinModal(true)}
                            className="w-full py-3 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white rounded-2xl font-bold text-sm transition-all shadow-md shadow-brand-600/20 flex items-center justify-center gap-2"
                        >
                            <span>Request to Join</span>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Location & Contact Card */}
                    <div className="bg-white dark:bg-[#0f172a] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-4">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">
                            Location & Contact
                        </h3>

                        <div className="space-y-3 text-xs">
                            <div className="flex items-start gap-3 text-gray-600 dark:text-gray-300">
                                <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-semibold block text-gray-900 dark:text-white">Address</span>
                                    <span>{organization.address || 'Address not specified'}</span>
                                    <span className="block text-gray-400 mt-0.5">
                                        {[organization.city, organization.state, organization.pincode].filter(Boolean).join(', ')}
                                    </span>
                                </div>
                            </div>

                            {organization.phone && (
                                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300 pt-2 border-t border-gray-100 dark:border-gray-800">
                                    <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                                    <div>
                                        <span className="font-semibold block text-gray-900 dark:text-white">Phone</span>
                                        <span>{organization.phone}</span>
                                    </div>
                                </div>
                            )}

                            {organization.email && (
                                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300 pt-2 border-t border-gray-100 dark:border-gray-800">
                                    <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                                    <div className="min-w-0">
                                        <span className="font-semibold block text-gray-900 dark:text-white">Email</span>
                                        <span className="truncate block">{organization.email}</span>
                                    </div>
                                </div>
                            )}

                            {organization.website && (
                                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300 pt-2 border-t border-gray-100 dark:border-gray-800">
                                    <Globe className="w-4 h-4 text-gray-400 shrink-0" />
                                    <div className="min-w-0">
                                        <span className="font-semibold block text-gray-900 dark:text-white">Website</span>
                                        <a 
                                            href={organization.website.startsWith('http') ? organization.website : `https://${organization.website}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-brand-600 dark:text-brand-400 underline truncate block"
                                        >
                                            {organization.website}
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Operational Timings */}
                    <div className="bg-white dark:bg-[#0f172a] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-3">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Clock className="w-4 h-4 text-brand-600" /> Operational Hours
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                            {hoursDisplay}
                        </p>
                    </div>
                </div>
            </div>

            {/* Sticky Bottom Action Bar for Desktop / Mobile */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 p-4 shadow-lg">
                <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="min-w-0">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{organization.name}</h4>
                            <p className="text-xs text-gray-500 truncate">{organization.city || 'Care Partner'}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowJoinModal(true)}
                        className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white rounded-2xl font-bold text-sm transition-all shadow-md shadow-brand-600/20 shrink-0 flex items-center gap-1.5"
                    >
                        <span>Request to Join</span>
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Request Modal */}
            <JoinRequestModal
                isOpen={showJoinModal}
                onClose={() => setShowJoinModal(false)}
                organization={organization}
                onSuccess={() => {
                    router.push('/doctor/care-networks?tab=requests');
                }}
            />
        </div>
    );
}
