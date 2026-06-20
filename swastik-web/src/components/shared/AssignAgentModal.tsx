'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useDeliveryAgentsStore } from '@/stores/deliveryAgentsStore';
import { Button } from '@/components/ui/Button';
import { Loader2, Users, AlertCircle, Phone, Send, X } from 'lucide-react';

interface AssignAgentModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderId: string;
    orderType: 'pharmacy' | 'diagnostic';
    onAssigned: () => void;
}

export function AssignAgentModal({ isOpen, onClose, orderId, orderType, onAssigned }: AssignAgentModalProps) {
    const { user } = useAuthStore();
    const { agents, loading, error, fetchAgents, assignAgent } = useDeliveryAgentsStore();
    const [assigningId, setAssigningId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && user?.id) {
            fetchAgents(user.id, (user.role as string) === 'pharmacy' ? 'pharmacy' : 'diagnostic_center');
        }
    }, [isOpen, user?.id, fetchAgents]);

    const handleAssign = async (agentId: string, phone: string) => {
        setAssigningId(agentId);
        const { success, trackingToken } = await assignAgent(orderId, orderType, agentId);
        setAssigningId(null);
        
        if (success && trackingToken) {
            // Send WhatsApp message with tracking link
            const trackingLink = `${window.location.origin}/agent/track/${trackingToken}`;
            const message = `New assignment received! Please open this link to start delivery/collection and share your live location: ${trackingLink}`;
            const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
            
            window.open(whatsappUrl, '_blank');
            onAssigned();
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* Dialog */}
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 flex flex-col max-h-[80vh]">
                <div className="p-6 pb-0 flex items-start justify-between shrink-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Users className="h-5 w-5 text-purple-600" />
                        Assign to Agent
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                        <X className="h-5 w-5 text-gray-400" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {error && (
                        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}

                    {loading && agents.length === 0 ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                        </div>
                    ) : agents.length === 0 ? (
                        <div className="text-center p-8 text-gray-500">
                            No active agents found. Please add agents from the Agents page.
                        </div>
                    ) : agents.filter(a => a.status === 'available').length === 0 ? (
                        <div className="text-center p-8 text-amber-600 bg-amber-50 rounded-lg">
                            All your agents are currently busy. Wait for an agent to finish their delivery.
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg">
                            {agents.filter(a => a.status === 'available').map(agent => (
                                <li key={agent.id} className="p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-gray-100">{agent.name}</p>
                                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                            <Phone className="h-3 w-3" />
                                            {agent.phone_number}
                                        </div>
                                    </div>
                                    <Button 
                                        size="sm" 
                                        onClick={() => handleAssign(agent.id, agent.phone_number)}
                                        disabled={assigningId !== null}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        {assigningId === agent.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                        ) : (
                                            <Send className="h-4 w-4 mr-1" />
                                        )}
                                        Assign
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
