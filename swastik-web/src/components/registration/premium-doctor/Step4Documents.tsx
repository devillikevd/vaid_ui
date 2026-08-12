import React, { useRef, useState } from 'react';
import { Upload, FileText, Image as ImageIcon, X, CheckCircle2 } from 'lucide-react';

export function Step4Documents({ data, updateData, nextStep, prevStep }: any) {
    const handleContinue = (e: React.FormEvent) => {
        e.preventDefault();
        nextStep();
    };

    const handleFileChange = (field: string, file: File | null) => {
        updateData({ [field]: file });
    };

    const FileUploadCard = ({ title, description, field, accept = "image/*,.pdf" }: { title: string, description: string, field: string, accept?: string }) => {
        const file = data[field];
        const fileInputRef = useRef<HTMLInputElement>(null);
        const [isDragging, setIsDragging] = useState(false);

        const handleDragOver = (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(true);
        };

        const handleDragLeave = (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
        };

        const handleDrop = (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileChange(field, e.dataTransfer.files[0]);
            }
        };

        return (
            <div 
                className={`relative border-2 border-dashed rounded-xl p-6 transition-all text-center flex flex-col items-center justify-center gap-3
                    ${isDragging ? 'border-[#22C55E] bg-[#22C55E]/5' : 
                      file ? 'border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.02)]' : 
                      'border-[rgba(255,255,255,0.1)] bg-[#09090B]/50 hover:border-[rgba(255,255,255,0.2)]'
                    }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept={accept}
                    onChange={(e) => handleFileChange(field, e.target.files?.[0] || null)}
                />
                
                {file ? (
                    <>
                        <div className="w-12 h-12 rounded-full bg-[#22C55E]/20 flex items-center justify-center mb-2">
                            <CheckCircle2 className="w-6 h-6 text-[#22C55E]" />
                        </div>
                        <div>
                            <p className="text-white font-medium text-sm truncate max-w-[200px]">{file.name}</p>
                            <p className="text-xs text-[#A1A1AA]">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                        <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleFileChange(field, null); }}
                            className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-white/10 text-[#A1A1AA] hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </>
                ) : (
                    <>
                        <div className="w-12 h-12 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center mb-2">
                            {accept.includes('image') && !accept.includes('pdf') ? 
                                <ImageIcon className="w-5 h-5 text-[#A1A1AA]" /> : 
                                <FileText className="w-5 h-5 text-[#A1A1AA]" />
                            }
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white mb-1">{title}</p>
                            <p className="text-xs text-[#A1A1AA]">{description}</p>
                        </div>
                        <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-2 text-xs font-semibold text-[#22C55E] hover:text-[#16A34A] transition-colors"
                        >
                            Browse Files
                        </button>
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="bg-[rgba(255,255,255,0.02)] backdrop-blur-xl border border-[rgba(255,255,255,0.08)] p-8 sm:p-10 rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Upload Documents</h2>
                <p className="text-[#A1A1AA]">We need to verify your credentials.</p>
            </div>

            <form onSubmit={handleContinue} className="space-y-6">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <FileUploadCard 
                        title="Profile Photo" 
                        description="Professional headshot for patients" 
                        field="profilePhoto" 
                        accept="image/png, image/jpeg" 
                    />
                    <FileUploadCard 
                        title="Medical Registration" 
                        description="State or Central Council Certificate" 
                        field="registrationCert" 
                    />
                    <FileUploadCard 
                        title="MBBS Degree" 
                        description="Final passing certificate" 
                        field="mbbsCert" 
                    />
                    <FileUploadCard 
                        title="Aadhaar Card" 
                        description="Front & back in single PDF" 
                        field="aadhaarCard" 
                    />
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
