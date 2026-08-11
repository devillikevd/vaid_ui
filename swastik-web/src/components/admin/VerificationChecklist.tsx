import React, { useState } from 'react';
import { adminApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Loader2, CheckCircle, Save, ShieldCheck } from 'lucide-react';

interface VerificationChecklistProps {
    providerId: string;
    providerType: string;
    initialChecklist: any;
    onUpdate?: (newChecklist: any) => void;
}

export default function VerificationChecklist({ providerId, providerType, initialChecklist, onUpdate }: VerificationChecklistProps) {
    const toast = useToast();
    const [isSaving, setIsSaving] = useState(false);
    
    // Safely parse initial state
    const defaultChecklist = {
        aadhaar_verified: false,
        degree_verified: false,
        registration_verified: false,
        email_verified: false,
        clinic_verified: false,
        admin_notes: ""
    };
    
    const [checklist, setChecklist] = useState({
        ...defaultChecklist,
        ...(initialChecklist || {})
    });
    
    const [notes, setNotes] = useState(checklist.admin_notes || "");

    const handleToggle = (key: keyof typeof defaultChecklist) => {
        if (key === 'admin_notes') return;
        setChecklist((prev: any) => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const payload = {
                verification_checklist: {
                    aadhaar_verified: !!checklist.aadhaar_verified,
                    degree_verified: !!checklist.degree_verified,
                    registration_verified: !!checklist.registration_verified,
                    email_verified: !!checklist.email_verified,
                    clinic_verified: !!checklist.clinic_verified
                },
                admin_notes: notes
            };
            
            const res = await adminApi.updateProviderVerification(providerType, providerId, payload);
            
            if (res.success) {
                toast.success('Verification Updated', 'The verification checklist has been successfully saved.');
                if (onUpdate) {
                    onUpdate(payload.verification_checklist);
                }
            } else {
                toast.error('Update Failed', res.error || 'Failed to update verification checklist.');
            }
        } catch (err: any) {
            toast.error('Error', err.message || 'An unexpected error occurred.');
        } finally {
            setIsSaving(false);
        }
    };

    // Calculate score
    const totalItems = 5;
    const verifiedItems = [
        checklist.aadhaar_verified, 
        checklist.degree_verified, 
        checklist.registration_verified, 
        checklist.email_verified, 
        checklist.clinic_verified
    ].filter(Boolean).length;
    const percentage = Math.round((verifiedItems / totalItems) * 100);

    return (
        <Card padding="md" className="border-t-4 border-t-vd-blue shadow-md bg-white">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-vd-blue" />
                    Verification Engine (Admin)
                </h3>
                <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-gray-500">Progress:</div>
                    <div className="w-24 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div 
                            className={`h-2.5 rounded-full ${percentage === 100 ? 'bg-green-500' : 'bg-vd-orange'}`}
                            style={{ width: `${percentage}%` }}
                        ></div>
                    </div>
                    <span className="text-sm font-bold text-gray-700">{percentage}%</span>
                </div>
            </div>

            <div className="space-y-3 mb-6">
                {[
                    { key: 'email_verified', label: 'Email Verified', desc: 'Provider responded to email OTP' },
                    { key: 'aadhaar_verified', label: 'Identity Verified (Aadhaar / Live Selfie)', desc: 'Selfie matches the government ID' },
                    { key: 'degree_verified', label: 'Degree Uploaded & Verified', desc: 'Valid graduation certificate' },
                    { key: 'registration_verified', label: 'Council Registration Verified', desc: 'Registration number checks out' },
                    { key: 'clinic_verified', label: 'Clinic Details Verified', desc: 'Location/Photos look authentic' }
                ].map((item) => (
                    <div key={item.key} 
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                            (checklist as any)[item.key] ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                        onClick={() => handleToggle(item.key as any)}
                    >
                        <div className="mt-0.5">
                            {(checklist as any)[item.key] ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                            )}
                        </div>
                        <div>
                            <div className={`font-semibold text-sm ${(checklist as any)[item.key] ? 'text-green-800' : 'text-gray-700'}`}>
                                {item.label}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Admin Notes (Internal)</label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-vd-blue focus:border-vd-blue min-h-[80px]"
                    placeholder="E.g. Blurred degree photo, requested re-upload..."
                />
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
                <Button 
                    variant="primary" 
                    onClick={handleSave} 
                    disabled={isSaving}
                    leftIcon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                >
                    Save Verification State
                </Button>
            </div>
        </Card>
    );
}
