'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { pharmacyApi } from '@/lib/api';
import { Edit, Loader2, MapPin, Phone, Mail, Clock, ShieldCheck, CheckCircle2, AlertCircle, Truck, Store, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function PharmacyProfilePage() {
    const user = useAuthStore((s) => s.user);
    const [profile, setProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);

    const loadProfile = async () => {
        setIsLoading(true);
        setFetchError(false);
        try {
            const res = await pharmacyApi.getProfile();
            if (res.success) {
                const data = (res.data as any)?.pharmacy || (res.data as any)?.profile || (res.data as any) || {};
                setProfile(data);
            } else {
                setFetchError(true);
            }
        } catch {
            setFetchError(true);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (user) loadProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
                <p className="text-sm text-gray-500">Loading profile data...</p>
            </div>
        );
    }

    if (fetchError || !profile) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
                <Store className="w-12 h-12 text-gray-400" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Unable to load pharmacy profile</h3>
                <p className="text-sm text-gray-500 max-w-sm text-center">There was a problem communicating with the server. Please check your connection and try again.</p>
                <Button onClick={loadProfile} variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50">Retry</Button>
            </div>
        );
    }

    const name = profile.name || user?.name || 'Unnamed Pharmacy';
    const email = profile.email || user?.email || 'No email provided';
    const profileImage = profile.profile_image_url || profile.image_url || null;

    // Delivery & Operations mapping matching backend fields
    const is24Hours = Boolean(profile.is_24_hours || profile.is24Hours);
    const isOpen = profile.is_open !== false; // default true if not set
    const offersDelivery = Boolean(profile.offers_delivery || profile.delivery_available || profile.deliveryAvailable);
    const deliveryRadius = profile.delivery_radius_km;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            {/* Header / Hero */}
            <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-gray-100 dark:ring-gray-800">
                <div className="h-32 bg-gradient-to-r from-orange-500 to-orange-400 relative">
                    <Link href="/pharmacy/settings?category=profile">
                        <Button size="sm" variant="outline" className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm transition-all shadow-sm">
                            <Edit className="w-4 h-4 mr-2" /> Edit Profile
                        </Button>
                    </Link>
                </div>
                <CardContent className="relative px-6 pb-6 pt-0 sm:px-8">
                    <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-end -mt-12 sm:-mt-16 mb-6">
                        <div className="relative">
                            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-4 border-white dark:border-gray-900 bg-gray-50 dark:bg-gray-800 overflow-hidden shadow-md shrink-0 flex items-center justify-center">
                                {profileImage ? (
                                    <img src={profileImage} alt={name} className="w-full h-full object-cover" />
                                ) : (
                                    <Store className="w-12 h-12 text-gray-300" />
                                )}
                            </div>
                            {isOpen ? (
                                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white dark:border-gray-900 shadow-sm uppercase tracking-wider flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Open
                                </div>
                            ) : (
                                <div className="absolute -bottom-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white dark:border-gray-900 shadow-sm uppercase tracking-wider">
                                    Closed
                                </div>
                            )}
                        </div>
                        <div className="flex-1 text-center sm:text-left space-y-1 mt-4 sm:mt-0">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center justify-center sm:justify-start gap-2">
                                {name}
                                {profile.license_number && <span title="Licensed Pharmacy"><CheckCircle2 className="w-5 h-5 text-blue-500" /></span>}
                            </h1>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center justify-center sm:justify-start gap-1.5">
                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                {profile.city ? `${profile.city}, ${profile.state || ''}` : 'Location not provided'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contact Information */}
                <Card className="border-0 shadow-sm ring-1 ring-gray-100 dark:ring-gray-800">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <User className="w-4 h-4 text-orange-500" /> Contact Info
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center shrink-0">
                                <Phone className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone Number</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{profile.phone || 'Not provided'}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center shrink-0">
                                <Mail className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email Address</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-all">{email}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center shrink-0">
                                <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Address</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {profile.address || 'Not provided'}
                                    {profile.city && <><br />{profile.city}, {profile.state} {profile.pincode}</>}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Operations & Delivery */}
                <Card className="border-0 shadow-sm ring-1 ring-gray-100 dark:ring-gray-800">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <Truck className="w-4 h-4 text-orange-500" /> Operations
                        </CardTitle>
                        <Link href="/pharmacy/settings?category=operations">
                            <Button variant="ghost" size="sm" className="h-6 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-2">Edit</Button>
                        </Link>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center shrink-0">
                                <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Timing</p>
                                {is24Hours ? (
                                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Open 24 Hours</p>
                                ) : (
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {profile.opening_time && profile.closing_time
                                            ? `${profile.opening_time} to ${profile.closing_time}`
                                            : 'Hours not specified'}
                                    </p>
                                )}
                                {profile.opening_hours && <p className="text-xs text-gray-500 mt-0.5">{profile.opening_hours}</p>}
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center shrink-0">
                                <Truck className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Delivery Services</p>
                                {offersDelivery ? (
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Available</p>
                                        {deliveryRadius && (
                                            <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                                                Up to {deliveryRadius} km
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm font-medium text-gray-500">Not currently offered</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Licensing & Compliance */}
                <div className="md:col-span-2">
                    <Card className="border-0 shadow-sm ring-1 ring-gray-100 dark:ring-gray-800">
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-orange-500" /> Licensing
                            </CardTitle>
                            <Link href="/pharmacy/settings?category=compliance">
                                <Button variant="ghost" size="sm" className="h-6 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-2">Edit</Button>
                            </Link>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Pharmacy License</p>
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {profile.license_number || profile.licenseNumber || 'Not provided'}
                                        </p>
                                        {(profile.license_number || profile.licenseNumber) ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                        ) : (
                                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                                        )}
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Drug License (DL)</p>
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {profile.drug_license_number || profile.drugLicenseNumber || 'Not provided'}
                                        </p>
                                        {(profile.drug_license_number || profile.drugLicenseNumber) ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                        ) : (
                                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                                        )}
                                    </div>
                                </div>

                                <div className="sm:col-span-2 p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">License Document</p>
                                    {profile.license_document_url || profile.licenseDocumentUrl ? (
                                        <a
                                            href={profile.license_document_url || profile.licenseDocumentUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                                        >
                                            <ShieldCheck className="w-4 h-4" /> View Registration Document
                                        </a>
                                    ) : (
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <AlertCircle className="w-4 h-4" /> No document uploaded
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
