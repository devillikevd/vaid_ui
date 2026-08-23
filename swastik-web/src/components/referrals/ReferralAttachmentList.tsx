import React, { useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';

export interface ReferralAttachmentListProps {
    referralId?: string;
    attachments: any[];
    onAttachmentAdded?: (attachment: any) => void;
    readonly?: boolean;
}

export function ReferralAttachmentList({ referralId, attachments, onAttachmentAdded, readonly = false }: ReferralAttachmentListProps) {
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [docType, setDocType] = useState('report');
    const [reportId, setReportId] = useState('');
    const [prescriptionId, setPrescriptionId] = useState('');

    const handleAttach = async () => {
        if (!referralId) return;
        if (docType === 'report' && !reportId) return toast.error('Enter a Report ID');
        if (docType === 'prescription' && !prescriptionId) return toast.error('Enter a Prescription ID');

        setLoading(true);
        try {
            const data = {
                document_type: docType,
                report_id: docType === 'report' ? reportId : undefined,
                prescription_id: docType === 'prescription' ? prescriptionId : undefined,
                file_name: docType === 'report' ? `Report ${reportId}` : `Prescription ${prescriptionId}`,
            };

            const res = await api.universalReferrals.addReferralAttachment(referralId, data);
            if (res.success) {
                toast.success('Attached successfully');
                onAttachmentAdded?.(res.data);
                setReportId('');
                setPrescriptionId('');
            } else {
                toast.error(res.message || 'Failed to attach');
            }
        } catch (error: any) {
            toast.error(error.message || 'Error attaching document');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {!readonly && referralId && (
                <div className="flex flex-col gap-2 p-4 border rounded dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <h4 className="text-sm font-semibold">Attach Existing Document</h4>
                    <div className="flex gap-2">
                        <select 
                            className="p-2 border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            value={docType}
                            onChange={(e) => setDocType(e.target.value)}
                        >
                            <option value="report">Lab Report</option>
                            <option value="prescription">Prescription</option>
                        </select>
                        {docType === 'report' ? (
                            <input 
                                type="text" 
                                placeholder="Report ID" 
                                className="flex-1 p-2 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                                value={reportId}
                                onChange={(e) => setReportId(e.target.value)}
                            />
                        ) : (
                            <input 
                                type="text" 
                                placeholder="Prescription ID" 
                                className="flex-1 p-2 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                                value={prescriptionId}
                                onChange={(e) => setPrescriptionId(e.target.value)}
                            />
                        )}
                        <Button size="sm" onClick={handleAttach} disabled={loading}>
                            {loading ? '...' : 'Attach'}
                        </Button>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                {attachments.map(att => (
                    <div key={att.id || att.file_name} className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded text-sm">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-gray-100">{att.file_name}</span>
                            <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 capitalize">{att.document_type}</span>
                        </div>
                    </div>
                ))}
                {attachments.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">No attachments found.</p>
                )}
            </div>
        </div>
    );
}
