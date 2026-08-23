'use client';

import { useEffect, useState } from 'react';
import { useDeliveryAgentsStore } from '@/stores/deliveryAgentsStore';
import { useAuthStore } from '@/stores/authStore';
import { UserPlus, Trash2, Users, AlertCircle, Loader2 } from 'lucide-react';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { DashboardCard } from '@/components/shared/DashboardCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function DiagnosticCenterAgentsPage() {
    const { user } = useAuthStore();
    const { agents, loading, error, fetchAgents, addAgent, deleteAgent, clearError } = useDeliveryAgentsStore();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    
    const { dialogProps, confirm } = useConfirmDialog();

    useEffect(() => {
        if (user?.id) {
            fetchAgents(user.id, 'diagnostic_center');
        }
    }, [user?.id, fetchAgents]);

    const handleAddAgent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id || !name || !phone) return;
        
        setIsAdding(true);
        const success = await addAgent(user.id, 'diagnostic_center', name, phone);
        setIsAdding(false);
        
        if (success) {
            setName('');
            setPhone('');
        }
    };

    const handleDelete = async (agentId: string, agentName: string) => {
        const confirmed = await confirm({
            title: 'Remove Agent',
            message: `Are you sure you want to remove ${agentName}? They will no longer be able to deliver orders.`,
            confirmLabel: 'Remove',
            variant: 'danger'
        });
        
        if (confirmed) {
            await deleteAgent(agentId);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Delivery & Collection Agents"
                subtitle="Manage your fleet for home sample collections."
            />

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    {error}
                    <button onClick={clearError} className="ml-auto underline">Dismiss</button>
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-1">
                    <DashboardCard>
                        <form onSubmit={handleAddAgent} className="space-y-4">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <UserPlus className="h-5 w-5 text-purple-600" />
                                Add New Agent
                            </h2>
                            <Input
                                label="Full Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Rahul Kumar"
                                required
                            />
                            <Input
                                label="Phone Number"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="10-digit mobile number"
                                type="tel"
                                required
                            />
                            <Button 
                                type="submit" 
                                className="w-full" 
                                disabled={isAdding || !name || !phone}
                            >
                                {isAdding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Add Agent
                            </Button>
                        </form>
                    </DashboardCard>
                </div>

                <div className="md:col-span-2">
                    <DashboardCard noPadding>
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                            <Users className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Active Agents ({agents.length})</h2>
                        </div>
                        
                        {loading && agents.length === 0 ? (
                            <div className="p-8 flex justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                            </div>
                        ) : agents.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                No delivery agents added yet.
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                                {agents.map(agent => (
                                    <li key={agent.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:bg-gray-800/50 dark:hover:bg-gray-800/50">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-gray-900 dark:text-gray-100">{agent.name}</p>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${agent.status === 'available' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                                    {agent.status === 'available' ? 'Available' : 'Busy'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{agent.phone_number}</p>
                                        </div>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={() => handleDelete(agent.id, agent.name)}
                                            className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </DashboardCard>
                </div>
            </div>
            <ConfirmDialog {...dialogProps} />
        </div>
    );
}
