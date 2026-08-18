/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { 
    Building2, Hospital, MapPin, Phone, Mail, Globe, 
    Clock, ShieldCheck, Star, Users, Stethoscope, 
    ArrowLeft, ChevronRight, CheckCircle2, Bed, 
    AlertCircle, Loader2, Sparkles, Navigation, Calendar,
    FileText
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
                <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Loading organization profile...</p>
            </div>
        );
    }

    if (error || !organization) {
        return (
            <div className="max-w-3xl mx-auto py-16 px-4 text-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-red-200 dark:border-red-800">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2">Organization Not Found</h2>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-6">{error || 'This organization profile could not be retrieved.'}</p>
                <Link
                    href="/doctor/care-networks/find"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-extrabold text-sm shadow-md hover:bg-emerald-700 transition-colors"
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
    const rel = organization.relationship || 'NOT_CONNECTED';

    // Parse opening hours
    let hoursDisplay: string = organization.is_24_hours ? 'Open 24 Hours / 7 Days' : 'Standard Working Hours';
    if (organization.opening_hours) {
        if (typeof organization.opening_hours === 'string') {
            try {
                const parsed = JSON.parse(organization.opening_hours);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    hoursDisplay = `${parsed.length} days operational / week`;
                }
            } catch {
                // ignore
            }
        } else if (typeof organization.opening_hours === 'object' && Object.keys(organization.opening_hours).length > 0) {
            hoursDisplay = 'Scheduled Operating Timings';
        }
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-36 sm:pb-40 px-4 sm:px-6">
            
            {/* Top Back Navigation */}
            <div className="flex items-center justify-between pt-2">
                <Link
                    href="/doctor/care-networks/find"
                    className="inline-flex items-center gap-2 text-xs font-extrabold text-emerald-700 dark:text-emerald-400 hover:underline transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Organizations
                </Link>

                {/* Mobile Top Action Button */}
                {rel === 'ACTIVE' ? (
                    <Link
                        href="/doctor/care-networks"
                        className="sm:hidden px-3.5 py-1.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-xl font-extrabold text-xs border border-emerald-300 dark:border-emerald-800 flex items-center gap-1"
                    >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Joined
                    </Link>
                ) : rel === 'REQUEST_PENDING' ? (
                    <Link
                        href="/doctor/care-networks?tab=requests"
                        className="sm:hidden px-3.5 py-1.5 bg-purple-100 text-purple-900 dark:bg-purple-950/60 dark:text-purple-200 rounded-xl font-extrabold text-xs border border-purple-300 dark:border-purple-800 flex items-center gap-1"
                    >
                        <Clock className="w-3.5 h-3.5 text-purple-600" /> Pending
                    </Link>
                ) : rel === 'INVITATION_PENDING' ? (
                    <Link
                        href="/doctor/care-networks?tab=invitations"
                        className="sm:hidden px-3.5 py-1.5 bg-amber-500 text-white rounded-xl font-extrabold text-xs flex items-center gap-1"
                    >
                        <Mail className="w-3.5 h-3.5 text-white" /> Invite
                    </Link>
                ) : (
                    <button
                        onClick={() => setShowJoinModal(true)}
                        className="sm:hidden px-4 py-2 bg-emerald-600 text-white rounded-xl font-extrabold text-xs shadow-md shadow-emerald-600/20"
                    >
                        Request to Join
                    </button>
                )}
            </div>

            {/* Profile Hero Header Card */}
            <div className="bg-white dark:bg-[#111c2e] rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                {/* Banner / Cover */}
                <div className="h-32 sm:h-44 w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 relative">
                    <div className="absolute inset-0 bg-black/15" />
                </div>

                <div className="px-6 pb-6 pt-0 relative">
                    {/* Avatar & Main Info */}
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14 mb-6">
                        <div className="flex items-end gap-4">
                            {organization.profile_image_url || organization.image_url ? (
                                <img
                                    src={organization.profile_image_url || organization.image_url}
                                    alt={organization.name}
                                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-4 border-white dark:border-[#111c2e] shadow-lg bg-white dark:bg-gray-800 shrink-0"
                                />
                            ) : (
                                <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-3xl border-4 border-white dark:border-[#111c2e] shadow-lg flex items-center justify-center font-bold text-3xl shrink-0 ${
                                    isHosp
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                }`}>
                                    {isHosp ? <Hospital className="w-12 h-12" /> : <Building2 className="w-12 h-12" />}
                                </div>
                            )}
                            <div className="space-y-1 mb-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-md uppercase tracking-wider ${
                                        isHosp 
                                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800' 
                                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                    }`}>
                                        {isHosp ? 'Hospital' : 'Clinic'}
                                    </span>

                                    {/* Relationship Badges */}
                                    {rel === 'ACTIVE' && (
                                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 shadow-sm">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Active Affiliation
                                        </span>
                                    )}

                                    {rel === 'REQUEST_PENDING' && (
                                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-900 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-300 dark:border-purple-800 flex items-center gap-1 shadow-sm">
                                            <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Join Request Pending
                                        </span>
                                    )}

                                    {rel === 'INVITATION_PENDING' && (
                                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1 shadow-sm">
                                            <Mail className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Invitation Received
                                        </span>
                                    )}

                                    {organization.approval_status === 'approved' && rel === 'NOT_CONNECTED' && (
                                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Verified Facility
                                        </span>
                                    )}
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white leading-tight">
                                    {organization.name}
                                </h1>
                            </div>
                        </div>

                        {/* Top Desktop CTA */}
                        <div className="hidden sm:flex items-center gap-3">
                            {rel === 'ACTIVE' ? (
                                <Link
                                    href="/doctor/care-networks"
                                    className="flex items-center gap-2 px-6 py-3 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 rounded-2xl font-extrabold text-sm transition-all shadow-sm"
                                >
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    <span>Affiliated Facility</span>
                                </Link>
                            ) : rel === 'REQUEST_PENDING' ? (
                                <Link
                                    href="/doctor/care-networks?tab=requests"
                                    className="flex items-center gap-2 px-6 py-3 bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-800 rounded-2xl font-extrabold text-sm transition-all shadow-sm"
                                >
                                    <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                    <span>View Sent Request</span>
                                </Link>
                            ) : rel === 'INVITATION_PENDING' ? (
                                <Link
                                    href="/doctor/care-networks?tab=invitations"
                                    className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-extrabold text-sm transition-all shadow-md shadow-amber-500/20"
                                >
                                    <Mail className="w-4 h-4 text-white" />
                                    <span>Review Invitation</span>
                                </Link>
                            ) : (
                                <button
                                    onClick={() => setShowJoinModal(true)}
                                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-2xl font-extrabold text-sm transition-all shadow-md shadow-emerald-600/20"
                                >
                                    <span>Request to Join</span>
                                    <ChevronRight className="w-4 h-4 text-white" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Quick Stats Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-gray-200 dark:border-gray-800 text-xs">
                        <div className="bg-gray-50 dark:bg-[#0c1422] p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800">
                            <span className="text-gray-600 dark:text-gray-400 font-bold block mb-0.5 uppercase tracking-wider text-[10px]">Rating & Reviews</span>
                            <div className="flex items-center gap-1.5 font-extrabold text-gray-900 dark:text-white text-sm">
                                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                <span>{ratingVal > 0 ? ratingVal.toFixed(1) : 'New'}</span>
                                {organization.total_reviews ? <span className="font-semibold text-gray-500 dark:text-gray-400 text-xs">({organization.total_reviews})</span> : null}
                            </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-[#0c1422] p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800">
                            <span className="text-gray-600 dark:text-gray-400 font-bold block mb-0.5 uppercase tracking-wider text-[10px]">Working Hours</span>
                            <div className="flex items-center gap-1.5 font-extrabold text-gray-900 dark:text-white text-sm truncate">
                                <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                                <span className="truncate">{organization.is_24_hours ? '24/7 Available' : 'Scheduled OPD'}</span>
                            </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-[#0c1422] p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800">
                            <span className="text-gray-600 dark:text-gray-400 font-bold block mb-0.5 uppercase tracking-wider text-[10px]">Location</span>
                            <div className="flex items-center gap-1.5 font-extrabold text-gray-900 dark:text-white text-sm truncate">
                                <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span className="truncate">{organization.city || 'City on file'}</span>
                            </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-[#0c1422] p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800">
                            <span className="text-gray-600 dark:text-gray-400 font-bold block mb-0.5 uppercase tracking-wider text-[10px]">Consultation</span>
                            <div className="flex items-center gap-1.5 font-extrabold text-emerald-700 dark:text-emerald-400 text-sm truncate">
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
                    <div className="bg-white dark:bg-[#111c2e] rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 space-y-3">
                        <h3 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> About {organization.name}
                        </h3>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-relaxed">
                            {organization.description || `${organization.name} is a certified ${isHosp ? 'hospital facility' : 'clinical healthcare provider'} dedicated to high quality patient care and multidisciplinary collaborations.`}
                        </p>
                    </div>

                    {/* 2. Departments & Specialties */}
                    {(specializations.length > 0 || departments.length > 0 || departmentList.length > 0) && (
                        <div className="bg-white dark:bg-[#111c2e] rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 space-y-4">
                            <h3 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                                <Stethoscope className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Specialties & Departments
                            </h3>

                            {specializations.length > 0 && (
                                <div>
                                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-2 uppercase tracking-wider">Clinical Specializations</span>
                                    <div className="flex flex-wrap gap-2">
                                        {specializations.map((s: string, idx: number) => (
                                            <span key={idx} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {(departmentList.length > 0 || departments.length > 0) && (
                                <div className="pt-2">
                                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-2 uppercase tracking-wider">Active Departments</span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        {(departmentList.length > 0 ? departmentList : departments.map((d: any) => ({ name: d }))).map((d: any, idx: number) => (
                                            <div key={idx} className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#0c1422] border border-gray-200 dark:border-gray-800 flex items-center gap-2.5">
                                                <Building2 className="w-4 h-4 text-gray-500 shrink-0" />
                                                <div className="min-w-0">
                                                    <span className="text-xs font-extrabold text-gray-900 dark:text-gray-100 block truncate">{d.name || d}</span>
                                                    {d.description && <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate block">{d.description}</span>}
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
                        <div className="bg-white dark:bg-[#111c2e] rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 space-y-3">
                            <h3 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                                <Bed className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Infrastructure & Facilities
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                {facilities.map((f: string, idx: number) => (
                                    <div key={idx} className="p-3 rounded-xl bg-gray-50 dark:bg-[#0c1422] border border-gray-200 dark:border-gray-800 flex items-center gap-2 text-xs font-bold text-gray-800 dark:text-gray-200">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                        <span className="truncate">{f}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 4. Affiliated Medical Team / Doctors */}
                    {affiliatedDoctors.length > 0 && (
                        <div className="bg-white dark:bg-[#111c2e] rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 space-y-4">
                            <h3 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Current Medical Roster
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {affiliatedDoctors.map((doc: any, idx: number) => (
                                    <div key={idx} className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#0c1422] border border-gray-200 dark:border-gray-800 flex items-center gap-3">
                                        {doc.profile_image_url ? (
                                            <img src={doc.profile_image_url} alt={doc.name} className="w-10 h-10 rounded-xl object-cover border border-gray-200 dark:border-gray-700" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-extrabold text-sm border border-emerald-200 dark:border-emerald-800">
                                                {doc.name ? doc.name.charAt(0) : 'D'}
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <span className="text-xs font-extrabold text-gray-900 dark:text-white block truncate">Dr. {doc.name}</span>
                                            <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400 block truncate">{doc.specialization || doc.role || 'Consultant'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column (1 Col): Location, Contact, Practice Opportunities */}
                <div className="space-y-6">
                    
                    {/* Practice Opportunities Card / Relationship-aware status */}
                    {rel === 'ACTIVE' ? (
                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 rounded-3xl p-6 border border-emerald-200 dark:border-emerald-900/50 space-y-4 shadow-sm">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                <h3 className="text-base font-extrabold text-emerald-950 dark:text-emerald-100">
                                    Active Affiliation
                                </h3>
                            </div>
                            <p className="text-xs font-medium text-emerald-900 dark:text-emerald-300 leading-relaxed">
                                You are already affiliated with {organization.name}. You can manage consultations, appointments, and hospital/clinic settings in My Care Networks.
                            </p>
                            <Link
                                href="/doctor/care-networks"
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-2xl font-extrabold text-sm transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
                            >
                                <span>Go to Care Networks</span>
                                <ChevronRight className="w-4 h-4 text-white" />
                            </Link>
                        </div>
                    ) : rel === 'REQUEST_PENDING' ? (
                        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/30 rounded-3xl p-6 border border-purple-200 dark:border-purple-900/50 space-y-4 shadow-sm">
                            <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                <h3 className="text-base font-extrabold text-purple-950 dark:text-purple-100">
                                    Join Request Sent
                                </h3>
                            </div>
                            <p className="text-xs font-medium text-purple-900 dark:text-purple-300 leading-relaxed">
                                Your application to join {organization.name} is currently awaiting review by administration.
                            </p>
                            <Link
                                href="/doctor/care-networks?tab=requests"
                                className="w-full py-3 bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white rounded-2xl font-extrabold text-sm transition-all shadow-md shadow-purple-600/20 flex items-center justify-center gap-2"
                            >
                                <span>View Sent Request</span>
                                <ChevronRight className="w-4 h-4 text-white" />
                            </Link>
                        </div>
                    ) : rel === 'INVITATION_PENDING' ? (
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 rounded-3xl p-6 border border-amber-200 dark:border-amber-900/50 space-y-4 shadow-sm">
                            <div className="flex items-center gap-2">
                                <Mail className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                <h3 className="text-base font-extrabold text-amber-950 dark:text-amber-100">
                                    Invitation Received
                                </h3>
                            </div>
                            <p className="text-xs font-medium text-amber-900 dark:text-amber-300 leading-relaxed">
                                {organization.name} has sent you a practice invitation. You can review proposed terms, counter-propose, or accept.
                            </p>
                            <Link
                                href="/doctor/care-networks?tab=invitations"
                                className="w-full py-3 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white rounded-2xl font-extrabold text-sm transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2"
                            >
                                <span>Review Invitation</span>
                                <ChevronRight className="w-4 h-4 text-white" />
                            </Link>
                        </div>
                    ) : (
                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 rounded-3xl p-6 border border-emerald-200 dark:border-emerald-900/50 space-y-4 shadow-sm">
                            <h3 className="text-base font-extrabold text-emerald-950 dark:text-emerald-100">
                                Partner with {organization.name}
                            </h3>
                            <p className="text-xs font-medium text-emerald-900 dark:text-emerald-300 leading-relaxed">
                                Send your practice availability, preferred consultation modes, and compensation terms to begin in-person or video consultations under this network.
                            </p>
                            <button
                                onClick={() => setShowJoinModal(true)}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-2xl font-extrabold text-sm transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
                            >
                                <span>Request to Join</span>
                                <ChevronRight className="w-4 h-4 text-white" />
                            </button>
                        </div>
                    )}

                    {/* Location & Contact Card */}
                    <div className="bg-white dark:bg-[#111c2e] rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 space-y-4">
                        <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                            Location & Contact
                        </h3>

                        <div className="space-y-3 text-xs font-medium">
                            <div className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                                <MapPin className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-extrabold block text-gray-900 dark:text-white">Address</span>
                                    <span>{organization.address || 'Address not specified'}</span>
                                    <span className="block text-gray-500 dark:text-gray-400 mt-0.5">
                                        {[organization.city, organization.state, organization.pincode].filter(Boolean).join(', ')}
                                    </span>
                                </div>
                            </div>

                            {organization.phone && (
                                <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300 pt-2 border-t border-gray-100 dark:border-gray-800">
                                    <Phone className="w-4 h-4 text-gray-500 shrink-0" />
                                    <div>
                                        <span className="font-extrabold block text-gray-900 dark:text-white">Phone</span>
                                        <span>{organization.phone}</span>
                                    </div>
                                </div>
                            )}

                            {organization.email && (
                                <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300 pt-2 border-t border-gray-100 dark:border-gray-800">
                                    <Mail className="w-4 h-4 text-gray-500 shrink-0" />
                                    <div className="min-w-0">
                                        <span className="font-extrabold block text-gray-900 dark:text-white">Email</span>
                                        <span className="truncate block">{organization.email}</span>
                                    </div>
                                </div>
                            )}

                            {organization.website && (
                                <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300 pt-2 border-t border-gray-100 dark:border-gray-800">
                                    <Globe className="w-4 h-4 text-gray-500 shrink-0" />
                                    <div className="min-w-0">
                                        <span className="font-extrabold block text-gray-900 dark:text-white">Website</span>
                                        <a 
                                            href={organization.website.startsWith('http') ? organization.website : `https://${organization.website}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-emerald-600 dark:text-emerald-400 underline truncate block font-bold"
                                        >
                                            {organization.website}
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Operational Timings */}
                    <div className="bg-white dark:bg-[#111c2e] rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 space-y-3">
                        <h3 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                            <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Operational Hours
                        </h3>
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                            {hoursDisplay}
                        </p>
                    </div>
                </div>
            </div>

            {/* Extra safe bottom spacer to ensure 100% visibility of all bottom content */}
            <div className="h-10 sm:h-12" aria-hidden="true" />

            {/* Sticky Bottom Action Bar for Desktop / Mobile — Aligned to dashboard content area */}
            <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-30 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 py-3.5 px-4 sm:px-8 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.4)]">
                <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="min-w-0">
                            <h4 className="text-sm font-extrabold text-gray-900 dark:text-white truncate">{organization.name}</h4>
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate">
                                {rel === 'ACTIVE' 
                                    ? '✓ Active Affiliation' 
                                    : rel === 'REQUEST_PENDING' 
                                    ? '⏳ Join Request Pending' 
                                    : rel === 'INVITATION_PENDING' 
                                    ? '✉ Invitation Received' 
                                    : (organization.city || 'Care Partner Network')}
                            </p>
                        </div>
                    </div>

                    {rel === 'ACTIVE' ? (
                        <Link
                            href="/doctor/care-networks"
                            className="px-6 py-2.5 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/70 dark:hover:bg-emerald-900/70 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 rounded-2xl font-extrabold text-sm transition-all shadow-sm shrink-0 flex items-center gap-1.5"
                        >
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>My Care Networks</span>
                        </Link>
                    ) : rel === 'REQUEST_PENDING' ? (
                        <Link
                            href="/doctor/care-networks?tab=requests"
                            className="px-6 py-2.5 bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/70 dark:hover:bg-purple-900/70 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-800 rounded-2xl font-extrabold text-sm transition-all shadow-sm shrink-0 flex items-center gap-1.5"
                        >
                            <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <span>View Request</span>
                        </Link>
                    ) : rel === 'INVITATION_PENDING' ? (
                        <Link
                            href="/doctor/care-networks?tab=invitations"
                            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-extrabold text-sm transition-all shadow-md shadow-amber-500/20 shrink-0 flex items-center gap-1.5"
                        >
                            <Mail className="w-4 h-4 text-white" />
                            <span>Review Invitation</span>
                        </Link>
                    ) : (
                        <button
                            onClick={() => setShowJoinModal(true)}
                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-2xl font-extrabold text-sm transition-all shadow-md shadow-emerald-600/20 shrink-0 flex items-center gap-1.5"
                        >
                            <span>Request to Join</span>
                            <ChevronRight className="w-4 h-4 text-white" />
                        </button>
                    )}
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
