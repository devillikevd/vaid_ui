import React from 'react';
import { Award, BookOpen, Stethoscope, Clock, Calendar, CheckSquare, Square } from 'lucide-react';

export function Step2Professional({ data, updateData, nextStep, prevStep }: any) {
    const handleContinue = (e: React.FormEvent) => {
        e.preventDefault();
        nextStep();
    };

    const toggleConsultation = (type: keyof typeof data.consultationTypes) => {
        updateData({
            consultationTypes: {
                ...data.consultationTypes,
                [type]: !data.consultationTypes[type]
            }
        });
    };

    return (
        <div className="bg-[rgba(255,255,255,0.02)] backdrop-blur-xl border border-[rgba(255,255,255,0.08)] p-8 sm:p-10 rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Professional Details</h2>
                <p className="text-[#A1A1AA]">Tell us about your medical background.</p>
            </div>

            <form onSubmit={handleContinue} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Medical Council */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[#A1A1AA]">Medical Council</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <Award className="h-5 w-5 text-[#A1A1AA] group-focus-within:text-[#22C55E] transition-colors" />
                            </div>
                            <input
                                type="text"
                                required
                                value={data.medicalCouncil}
                                onChange={(e) => updateData({ medicalCouncil: e.target.value })}
                                className="w-full bg-[#09090B]/50 border border-[rgba(255,255,255,0.1)] rounded-xl py-3 sm:py-2.5 pl-[42px] pr-4 text-base sm:text-[15px] text-white placeholder:text-[#A1A1AA]/50 focus:outline-none focus:ring-2 focus:ring-[#22C55E]/50 focus:border-[#22C55E] transition-all hover:border-[rgba(255,255,255,0.2)]"
                                placeholder="e.g. Medical Council of India"
                            />
                        </div>
                    </div>

                    {/* Registration Number */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[#A1A1AA]">Registration Number</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <BookOpen className="h-5 w-5 text-[#A1A1AA] group-focus-within:text-[#22C55E] transition-colors" />
                            </div>
                            <input
                                type="text"
                                required
                                value={data.registrationNumber}
                                onChange={(e) => updateData({ registrationNumber: e.target.value })}
                                className="w-full bg-[#09090B]/50 border border-[rgba(255,255,255,0.1)] rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-[#A1A1AA]/50 focus:outline-none focus:ring-2 focus:ring-[#22C55E]/50 focus:border-[#22C55E] transition-all uppercase"
                                placeholder="Registration No."
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Primary Qualification */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[#A1A1AA]">Highest Qualification</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <BookOpen className="h-5 w-5 text-[#A1A1AA] group-focus-within:text-[#22C55E] transition-colors" />
                            </div>
                            <input
                                type="text"
                                required
                                value={data.qualifications[0]?.degree}
                                onChange={(e) => {
                                    const newQuals = [...data.qualifications];
                                    newQuals[0] = { ...newQuals[0], degree: e.target.value };
                                    updateData({ qualifications: newQuals });
                                }}
                                className="w-full bg-[#09090B]/50 border border-[rgba(255,255,255,0.1)] rounded-xl py-3 sm:py-2.5 pl-[42px] pr-4 text-base sm:text-[15px] text-white placeholder:text-[#A1A1AA]/50 focus:outline-none focus:ring-2 focus:ring-[#22C55E]/50 focus:border-[#22C55E] transition-all hover:border-[rgba(255,255,255,0.2)]"
                                placeholder="e.g. MBBS, MD"
                            />
                        </div>
                    </div>

                    {/* Specialization */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[#A1A1AA]">Primary Specialization</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <Stethoscope className="h-5 w-5 text-[#A1A1AA] group-focus-within:text-[#22C55E] transition-colors" />
                            </div>
                            <input
                                type="text"
                                required
                                value={data.specializations[0] || ''}
                                onChange={(e) => updateData({ specializations: [e.target.value] })}
                                className="w-full bg-[#09090B]/50 border border-[rgba(255,255,255,0.1)] rounded-xl py-3 sm:py-2.5 pl-[42px] pr-4 text-base sm:text-[15px] text-white placeholder:text-[#A1A1AA]/50 focus:outline-none focus:ring-2 focus:ring-[#22C55E]/50 focus:border-[#22C55E] transition-all hover:border-[rgba(255,255,255,0.2)]"
                                placeholder="e.g. Cardiology"
                            />
                        </div>
                    </div>
                </div>

                {/* Experience & Languages */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[#A1A1AA]">Years of Experience</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <Clock className="h-5 w-5 text-[#A1A1AA] group-focus-within:text-[#22C55E] transition-colors" />
                            </div>
                            <input
                                type="number"
                                required
                                min="0"
                                max="70"
                                value={data.experienceYears}
                                onChange={(e) => updateData({ experienceYears: e.target.value })}
                                className="w-full bg-[#09090B]/50 border border-[rgba(255,255,255,0.1)] rounded-xl py-3 sm:py-2.5 pl-[42px] pr-4 text-base sm:text-[15px] text-white placeholder:text-[#A1A1AA]/50 focus:outline-none focus:ring-2 focus:ring-[#22C55E]/50 focus:border-[#22C55E] transition-all hover:border-[rgba(255,255,255,0.2)]"
                                placeholder="e.g. 5"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[#A1A1AA]">Languages Spoken</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <Calendar className="h-5 w-5 text-[#A1A1AA] group-focus-within:text-[#22C55E] transition-colors" />
                            </div>
                            <input
                                type="text"
                                value={data.languages.join(', ')}
                                onChange={(e) => updateData({ languages: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                className="w-full bg-[#09090B]/50 border border-[rgba(255,255,255,0.1)] rounded-xl py-3 sm:py-2.5 pl-[42px] pr-4 text-base sm:text-[15px] text-white placeholder:text-[#A1A1AA]/50 focus:outline-none focus:ring-2 focus:ring-[#22C55E]/50 focus:border-[#22C55E] transition-all hover:border-[rgba(255,255,255,0.2)]"
                                placeholder="English, Hindi"
                            />
                        </div>
                    </div>
                </div>

                {/* Consultation Types */}
                <div className="space-y-3 pt-2">
                    <label className="text-sm font-medium text-[#A1A1AA]">Consultation Types Offered</label>
                    <div className="flex flex-wrap gap-4">
                        {[
                            { id: 'video', label: 'Video Consultation' },
                            { id: 'clinic', label: 'In-Clinic Consultation' },
                            { id: 'home', label: 'Home Visit' }
                        ].map((type) => {
                            const isSelected = data.consultationTypes[type.id as keyof typeof data.consultationTypes];
                            return (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => toggleConsultation(type.id as keyof typeof data.consultationTypes)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                                        isSelected 
                                        ? 'bg-[#22C55E]/10 border-[#22C55E]/50 text-white' 
                                        : 'bg-[#09090B]/50 border-[rgba(255,255,255,0.1)] text-[#A1A1AA] hover:border-[rgba(255,255,255,0.2)]'
                                    }`}
                                >
                                    {isSelected ? <CheckSquare className="w-5 h-5 text-[#22C55E]" /> : <Square className="w-5 h-5" />}
                                    <span className="text-sm font-medium">{type.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="pt-6 flex gap-4">
                    <button
                        type="button"
                        onClick={prevStep}
                        className="flex-1 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.1)] text-white py-3.5 px-4 rounded-xl font-semibold text-[15px] transition-all"
                    >
                        Back
                    </button>
                    <button
                        type="submit"
                        className="flex-1 bg-gradient-to-r from-[#22C55E] to-[#16A34A] hover:from-[#16A34A] hover:to-[#15803d] text-white py-3.5 px-4 rounded-xl font-semibold text-[15px] shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_25px_rgba(34,197,94,0.4)] transition-all"
                    >
                        Continue
                    </button>
                </div>
            </form>
        </div>
    );
}
