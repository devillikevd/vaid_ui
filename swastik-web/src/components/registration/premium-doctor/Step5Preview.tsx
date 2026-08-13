/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
import React from 'react';
import { User, MapPin, Star, GraduationCap, Clock, CheckCircle2, Languages, Loader2 } from 'lucide-react';

export function Step5Preview({ data, prevStep, submitForm, isLoading }: any) {
    const photoUrl = data.profilePhoto ? URL.createObjectURL(data.profilePhoto) : null;

    return (
        <div className="bg-[rgba(255,255,255,0.02)] backdrop-blur-xl border border-[rgba(255,255,255,0.08)] p-8 sm:p-10 rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Profile Preview</h2>
                <p className="text-[#A1A1AA]">This is how patients will see your profile on Vaididea.</p>
            </div>

            {/* Profile Mock Card */}
            <div className="bg-[#09090B] border border-[rgba(255,255,255,0.05)] rounded-2xl p-6 relative overflow-hidden mb-8">
                {/* Header pattern */}
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-[#22C55E]/20 to-transparent" />
                
                <div className="relative z-10 flex flex-col sm:flex-row gap-6 items-start">
                    <div className="w-24 h-24 rounded-2xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] overflow-hidden shrink-0 shadow-lg">
                        {photoUrl ? (
                            <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <User className="w-8 h-8 text-[#A1A1AA]" />
                            </div>
                        )}
                    </div>

                    <div className="flex-1">
                        <div className="flex items-start justify-between gap-4 mb-1">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                    {data.name || 'Dr. Your Name'}
                                    <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
                                </h3>
                                <p className="text-[#22C55E] font-medium text-sm">
                                    {data.specializations[0] || 'Your Specialization'}
                                </p>
                            </div>
                            <div className="flex items-center gap-1 bg-[#22C55E]/10 px-2 py-1 rounded-lg">
                                <Star className="w-4 h-4 text-[#22C55E] fill-[#22C55E]" />
                                <span className="font-bold text-[#22C55E] text-sm">5.0</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-y-3 gap-x-4 mt-4">
                            <div className="flex items-center gap-2 text-sm text-[#A1A1AA]">
                                <GraduationCap className="w-4 h-4" />
                                <span>{data.qualifications[0]?.degree || 'Your Degree'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-[#A1A1AA]">
                                <Clock className="w-4 h-4" />
                                <span>{data.experienceYears || '0'} Years Experience</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-[#A1A1AA]">
                                <MapPin className="w-4 h-4" />
                                <span className="truncate">{data.clinicName || 'Clinic Name'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-[#A1A1AA]">
                                <Languages className="w-4 h-4" />
                                <span className="truncate">{data.languages.join(', ') || 'Languages'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Fees */}
                <div className="mt-6 pt-6 border-t border-[rgba(255,255,255,0.05)] flex gap-4">
                    {data.consultationTypes.video && (
                        <div className="flex-1 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl p-3 text-center">
                            <p className="text-xs text-[#A1A1AA] mb-1">Video Consult</p>
                            <p className="text-white font-bold">₹{data.videoFee || '0'}</p>
                        </div>
                    )}
                    {data.consultationTypes.clinic && (
                        <div className="flex-1 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl p-3 text-center">
                            <p className="text-xs text-[#A1A1AA] mb-1">Clinic Visit</p>
                            <p className="text-white font-bold">₹{data.clinicFee || '0'}</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-2 flex gap-4">
                <button
                    type="button"
                    onClick={prevStep}
                    disabled={isLoading}
                    className="flex-1 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.1)] text-white py-3.5 px-4 rounded-xl font-semibold text-[15px] transition-all disabled:opacity-50"
                >
                    Edit Details
                </button>
                <button
                    onClick={submitForm}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#22C55E] to-[#16A34A] hover:from-[#16A34A] hover:to-[#15803d] text-white py-3.5 px-4 rounded-xl font-semibold text-[15px] shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_25px_rgba(34,197,94,0.4)] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Submitting...</span>
                        </>
                    ) : (
                        <span>Submit Registration</span>
                    )}
                </button>
            </div>
        </div>
    );
}
