import React from 'react';
import { MapPin, Building, IndianRupee, Video, Home } from 'lucide-react';

export function Step3Clinic({ data, updateData, nextStep, prevStep }: any) {
    const handleContinue = (e: React.FormEvent) => {
        e.preventDefault();
        nextStep();
    };

    return (
        <div className="bg-[rgba(255,255,255,0.02)] backdrop-blur-xl border border-[rgba(255,255,255,0.08)] p-8 sm:p-10 rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Clinic & Fees</h2>
                <p className="text-[#A1A1AA]">Where do you practice and what are your charges?</p>
            </div>

            <form onSubmit={handleContinue} className="space-y-6">
                {/* Clinic Name */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[#A1A1AA]">Clinic / Hospital Name</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Building className="h-5 w-5 text-[#A1A1AA] group-focus-within:text-[#22C55E] transition-colors" />
                        </div>
                        <input
                            type="text"
                            required
                            value={data.clinicName}
                            onChange={(e) => updateData({ clinicName: e.target.value })}
                                className="w-full bg-[#09090B]/50 border border-[rgba(255,255,255,0.1)] rounded-xl py-3 sm:py-2.5 pl-[42px] pr-4 text-base sm:text-[15px] text-white placeholder:text-[#A1A1AA]/50 focus:outline-none focus:ring-2 focus:ring-[#22C55E]/50 focus:border-[#22C55E] transition-all hover:border-[rgba(255,255,255,0.2)]"
                            placeholder="Vaididea Health Clinic"
                        />
                    </div>
                </div>

                {/* Complete Address */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[#A1A1AA]">Complete Address</label>
                    <div className="relative group">
                        <div className="absolute top-3.5 left-0 pl-3.5 flex items-start pointer-events-none">
                            <MapPin className="h-5 w-5 text-[#A1A1AA] group-focus-within:text-[#22C55E] transition-colors" />
                        </div>
                        <textarea
                            required
                            rows={3}
                            value={data.address}
                            onChange={(e) => updateData({ address: e.target.value })}
                            className="w-full bg-[#09090B]/50 border border-[rgba(255,255,255,0.1)] rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-[#A1A1AA]/50 focus:outline-none focus:ring-2 focus:ring-[#22C55E]/50 focus:border-[#22C55E] transition-all resize-none"
                            placeholder="Enter full address..."
                        />
                    </div>
                </div>

                {/* Map Mock UI */}
                <div className="w-full h-32 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.1)] flex flex-col items-center justify-center gap-2 relative overflow-hidden group cursor-pointer hover:border-[#22C55E]/50 transition-colors">
                    <div className="absolute inset-0 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=New+Delhi&zoom=13&size=600x300&maptype=roadmap&style=element:geometry%7Ccolor:0x242f3e&style=element:labels.text.stroke%7Ccolor:0x242f3e&style=element:labels.text.fill%7Ccolor:0x746855&key=')] opacity-20 bg-cover bg-center grayscale" />
                    <MapPin className="w-8 h-8 text-[#22C55E] relative z-10" />
                    <span className="text-sm text-[#A1A1AA] font-medium relative z-10 group-hover:text-white transition-colors">Click to pin location on Map</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
                    {/* Video Fee */}
                    <div className="space-y-2 opacity-100 transition-opacity">
                        <label className="text-sm font-medium text-[#A1A1AA]">Video Fee</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <IndianRupee className="h-4 w-4 text-[#A1A1AA] group-focus-within:text-[#22C55E] transition-colors" />
                            </div>
                            <input
                                type="number"
                                required={data.consultationTypes?.video}
                                disabled={!data.consultationTypes?.video}
                                value={data.videoFee}
                                onChange={(e) => updateData({ videoFee: e.target.value })}
                                className="w-full bg-[#09090B]/50 border border-[rgba(255,255,255,0.1)] rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-[#A1A1AA]/50 focus:outline-none focus:ring-2 focus:ring-[#22C55E]/50 focus:border-[#22C55E] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                placeholder="500"
                            />
                        </div>
                    </div>

                    {/* Clinic Fee */}
                    <div className="space-y-2 transition-opacity">
                        <label className="text-sm font-medium text-[#A1A1AA]">Clinic Fee</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <IndianRupee className="h-4 w-4 text-[#A1A1AA] group-focus-within:text-[#22C55E] transition-colors" />
                            </div>
                            <input
                                type="number"
                                required={data.consultationTypes?.clinic}
                                disabled={!data.consultationTypes?.clinic}
                                value={data.clinicFee}
                                onChange={(e) => updateData({ clinicFee: e.target.value })}
                                className="w-full bg-[#09090B]/50 border border-[rgba(255,255,255,0.1)] rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-[#A1A1AA]/50 focus:outline-none focus:ring-2 focus:ring-[#22C55E]/50 focus:border-[#22C55E] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                placeholder="800"
                            />
                        </div>
                    </div>

                    {/* Followup Fee */}
                    <div className="space-y-2 transition-opacity sm:col-span-2 lg:col-span-1">
                        <label className="text-sm font-medium text-[#A1A1AA]">Follow-up Fee</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <IndianRupee className="h-4 w-4 text-[#A1A1AA] group-focus-within:text-[#22C55E] transition-colors" />
                            </div>
                            <input
                                type="number"
                                value={data.followupFee}
                                onChange={(e) => updateData({ followupFee: e.target.value })}
                                className="w-full bg-[#09090B]/50 border border-[rgba(255,255,255,0.1)] rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-[#A1A1AA]/50 focus:outline-none focus:ring-2 focus:ring-[#22C55E]/50 focus:border-[#22C55E] transition-all"
                                placeholder="300"
                            />
                        </div>
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
