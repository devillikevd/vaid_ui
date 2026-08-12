'use client';

import React, { useState } from 'react';
import { AlertCircle, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DoctorProfile } from '@/stores/doctorStore';
import { FileUpload } from '@/components/shared/FileUpload';
import { doctorApi, uploadApi } from '@/lib/api';

interface RejectionBannerProps {
    profile: DoctorProfile;
    onReupload: () => void;
}

export function RejectionBanner({ profile, onReupload }: RejectionBannerProps) {
    const [uploadingFor, setUploadingFor] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    
    if (profile.approval_status !== 'rejected') return null;

    const rejectedDocs: string[] = profile.rejected_documents || [];
    const reason = profile.rejection_reason || 'There were issues with some of your documents.';

    const handleUpload = async (docType: string) => {
        if (!file) return;
        setUploadingFor(docType);
        try {
            // Use real upload API
            const uploadRes = await uploadApi.uploadFile(file, 'doctor_docs') as any;
            if (!uploadRes.success || !uploadRes.data?.url) {
                throw new Error(uploadRes.error || 'Failed to upload document');
            }
            
            const uploadedUrl = uploadRes.data.url;
            
            // Updating profile in DB
            const payload: any = { approval_status: 'under_review' };
            if (docType === 'degree') payload.degree_certificate_url = uploadedUrl;
            if (docType === 'council') payload.license_document_url = uploadedUrl;
            if (docType === 'govtid') payload.government_id_url = uploadedUrl;
            
            await doctorApi.updateProfile(payload);
            setFile(null);
            onReupload();
        } catch (err) {
            console.error(err);
            alert("Upload failed.");
        } finally {
            setUploadingFor(null);
        }
    };

    return (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-start gap-4 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-red-900">Application Rejected</h3>
                    <p className="text-red-700 mt-1">{reason}</p>
                </div>
            </div>

            {rejectedDocs.length > 0 && (
                <div className="mt-6 border-t border-red-200 pt-6">
                    <h4 className="font-semibold text-red-800 mb-4">Please upload the following documents again:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {rejectedDocs.map(doc => (
                            <div key={doc} className="bg-white p-4 rounded-lg border border-red-100 shadow-sm">
                                <h5 className="font-medium text-gray-900 mb-2 capitalize">{doc.replace('_', ' ')}</h5>
                                <FileUpload 
                                    label={`Upload New ${doc.replace('_', ' ')}`}
                                    value={file}
                                    onChange={setFile}
                                />
                                {file && (
                                    <Button 
                                        className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white" 
                                        onClick={() => handleUpload(doc)}
                                        isLoading={uploadingFor === doc}
                                    >
                                        <UploadCloud className="h-4 w-4 mr-2" /> Submit Re-upload
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
