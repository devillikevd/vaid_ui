import React from 'react';
import { LucideIcon, Building, Activity, Pill, CheckCircle2, XCircle, Clock, AlertCircle, ChevronDown, CheckCircle } from 'lucide-react';

export type PartnershipStatus = 'pending' | 'changes_requested' | 'active' | 'rejected' | 'cancelled' | 'terminated';
export type OrgType = 'clinic' | 'hospital' | 'pharmacy' | 'diagnostic_center';

export interface Partnership {
    id: string;
    status: PartnershipStatus;
    partnership_type?: string;
    is_initiator: boolean;
    initiator_type: OrgType;
    partner: {
        id: string;
        type: OrgType;
        name: string;
        city?: string;
        state?: string;
        is_verified?: boolean;
        address?: string;
        image_url?: string;
        typeLabel?: string;
    };
    created_at: string;
    updated_at: string;
    metadata?: any;
}

interface PartnershipCardProps {
    partnership: Partnership;
    onAccept?: (id: string) => void;
    onReject?: (id: string) => void;
    onRequestChanges?: (id: string) => void;
    onAcceptChanges?: (id: string) => void;
    onCancel?: (id: string) => void;
    onTerminate?: (id: string) => void;
    onViewDetails?: (id: string) => void;
}

const ORG_ICONS: Record<string, LucideIcon> = {
    clinic: Activity,
    hospital: Building,
    pharmacy: Pill,
    diagnostic_center: Activity,
};

const getStatusConfig = (status: PartnershipStatus, isInitiator: boolean) => {
    switch (status) {
        case 'active':
            return { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30', label: 'Active', icon: CheckCircle2 };
        case 'pending':
            return { 
                color: 'text-amber-600 dark:text-amber-400', 
                bg: 'bg-amber-100 dark:bg-amber-900/30', 
                label: isInitiator ? 'Request Sent' : 'Pending Request',
                icon: Clock 
            };
        case 'changes_requested':
            return { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30', label: 'Changes Requested', icon: AlertCircle };
        case 'rejected':
            return { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Rejected', icon: XCircle };
        case 'terminated':
            return { color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800', label: 'Terminated', icon: XCircle };
        case 'cancelled':
            return { color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800', label: 'Cancelled', icon: XCircle };
        default:
            return { color: 'text-gray-600', bg: 'bg-gray-100', label: 'Unknown', icon: Clock };
    }
};

export const PartnershipCard: React.FC<PartnershipCardProps> = ({
    partnership,
    onAccept,
    onReject,
    onRequestChanges,
    onAcceptChanges,
    onCancel,
    onTerminate,
    onViewDetails
}) => {
    const [showManage, setShowManage] = React.useState(false);
    const { partner, status, is_initiator } = partnership;
    const Icon = ORG_ICONS[partner.type] || Building;
    const statusConfig = getStatusConfig(status, is_initiator);
    const StatusIcon = statusConfig.icon;

    // Compact Vaididea hover state: subtle lift, slightly stronger border, no aggressive scaling.
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 flex flex-col gap-4">
            
            {/* Header */}
            <div className="flex justify-between items-start gap-4">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                        <Icon size={20} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white leading-tight flex items-center gap-1.5">
                            {partner.name}
                            {partner.is_verified && <span title="Verified"><CheckCircle className="w-4 h-4 text-blue-500" /></span>}
                        </h3>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                            <span>{partner.typeLabel || partner.type}</span>
                            {partner.city && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                                    <span>{partner.city}{partner.state ? `, ${partner.state}` : ''}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Status Badge */}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusConfig.bg} ${statusConfig.color}`}>
                    <StatusIcon size={14} />
                    {statusConfig.label}
                </div>
            </div>

            {/* Content (e.g. requested changes message) */}
            {status === 'changes_requested' && partnership.metadata?.last_changes_message && (
                <div className="bg-gray-50 dark:bg-gray-750 p-3 rounded-lg text-sm text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
                    <p className="font-medium text-xs text-gray-500 mb-1">Last Message:</p>
                    <p>{partnership.metadata.last_changes_message}</p>
                </div>
            )}
            
            {/* Capabilities */}
            {partnership.metadata?.capabilities && partnership.metadata.capabilities.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                    {partnership.metadata.capabilities.map((cap: string) => (
                        <span key={cap} className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                            {cap}
                        </span>
                    ))}
                </div>
            )}

            {/* Actions */}
            <div className="pt-3 flex items-center justify-between mt-auto border-t border-gray-100 dark:border-gray-700/50">
                <button 
                    onClick={() => onViewDetails?.(partnership.id)}
                    className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                >
                    View Details
                </button>
                {status !== 'terminated' && status !== 'cancelled' && status !== 'rejected' && (
                    <button 
                        onClick={() => setShowManage(!showManage)}
                        className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 transition-colors"
                    >
                        Manage <ChevronDown size={14} className={`transform transition-transform ${showManage ? 'rotate-180' : ''}`} />
                    </button>
                )}
            </div>
            
            {showManage && (
                <div className="flex flex-col gap-2 pt-2 border-t border-gray-100 dark:border-gray-700/50 animate-in slide-in-from-top-2">
                    {status === 'pending' && !is_initiator && (
                        <>
                            <button 
                                onClick={() => onAccept?.(partnership.id)}
                                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                Accept Request
                            </button>
                            <button 
                                onClick={() => onRequestChanges?.(partnership.id)}
                                className="w-full px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium transition-colors"
                            >
                                Request Changes
                            </button>
                            <button 
                                onClick={() => onReject?.(partnership.id)}
                                className="w-full px-4 py-2 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 border border-gray-200 dark:border-gray-600 hover:border-red-200 dark:hover:border-red-800 rounded-lg text-sm font-medium transition-colors"
                            >
                                Reject
                            </button>
                        </>
                    )}

                    {status === 'pending' && is_initiator && (
                        <button 
                            onClick={() => onCancel?.(partnership.id)}
                            className="w-full px-4 py-2 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 border border-gray-200 dark:border-gray-600 hover:border-red-200 dark:hover:border-red-800 rounded-lg text-sm font-medium transition-colors"
                        >
                            Cancel Request
                        </button>
                    )}

                    {status === 'changes_requested' && partnership.metadata?.changes_requested_by !== partnership.initiator_type && is_initiator && (
                        <>
                            <button 
                                onClick={() => onAcceptChanges?.(partnership.id)}
                                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                Accept Changes
                            </button>
                            <button 
                                onClick={() => onRequestChanges?.(partnership.id)}
                                className="w-full px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium transition-colors"
                            >
                                Suggest Changes
                            </button>
                            <button 
                                onClick={() => onCancel?.(partnership.id)}
                                className="w-full px-4 py-2 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 border border-gray-200 dark:border-gray-600 hover:border-red-200 dark:hover:border-red-800 rounded-lg text-sm font-medium transition-colors"
                            >
                                Withdraw Request
                            </button>
                        </>
                    )}

                    {status === 'active' && (
                        <button 
                            onClick={() => onTerminate?.(partnership.id)}
                            className="w-full px-4 py-2 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 border border-gray-200 dark:border-gray-600 hover:border-red-200 dark:hover:border-red-800 rounded-lg text-sm font-medium transition-colors"
                        >
                            Terminate Partnership
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
