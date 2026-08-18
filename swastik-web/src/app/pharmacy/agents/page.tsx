'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
    Users, UserPlus, Trash2, MapPin, Phone, Car, Clock, 
    AlertCircle, Loader2, RefreshCw, X, BadgeInfo, CheckCircle
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useDeliveryAgentsStore, type DeliveryAgent } from '@/stores/deliveryAgentsStore';
import { useAuthStore } from '@/stores/authStore';

function getInitials(name: string) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

function timeAgo(dateString?: string | null) {
    if (!dateString) return 'Location unknown';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return 'Location unknown';
    
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function PharmacyFleetManagementPage() {
    const { user } = useAuthStore();
    const { agents, loading, error, fetchAgents, addAgent, deleteAgent, clearError } = useDeliveryAgentsStore();
    const toast = useToast();
    const { dialogProps, confirm } = useConfirmDialog();

    // UI States
    const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState<DeliveryAgent | null>(null);
    
    // Add Form States
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newVehicle, setNewVehicle] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        if (user?.id) {
            void fetchAgents(user.id, 'pharmacy');
        }
    }, [user?.id, fetchAgents]);

    const handleRefresh = () => {
        if (user?.id) {
            clearError();
            void fetchAgents(user.id, 'pharmacy');
        }
    };

    const handleAddAgent = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const trimmedName = newName.trim();
        const trimmedPhone = newPhone.trim();
        const trimmedVehicle = newVehicle.trim();
        
        if (!user?.id || !trimmedName || !trimmedPhone) return;
        
        setIsAdding(true);
        const success = await addAgent(user.id, 'pharmacy', trimmedName, trimmedPhone, trimmedVehicle);
        setIsAdding(false);
        
        if (success) {
            toast.success('Agent Added', 'Delivery agent added successfully.');
            setNewName('');
            setNewPhone('');
            setNewVehicle('');
            setIsAddDrawerOpen(false);
        } else {
            toast.error('Add Failed', 'Unable to add delivery agent. Please try again.');
        }
    };

    const handleDelete = async (agent: DeliveryAgent, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        
        const confirmed = await confirm({
            title: 'Remove Delivery Agent',
            message: `Are you sure you want to remove ${agent.name}? They will lose access to active deliveries.`,
            confirmLabel: 'Remove Agent',
            variant: 'danger'
        });
        
        if (confirmed) {
            const success = await deleteAgent(agent.id);
            if (success) {
                toast.success('Agent Removed', `${agent.name} has been removed from your fleet.`);
                if (selectedAgent?.id === agent.id) {
                    setSelectedAgent(null);
                }
            } else {
                toast.error('Removal Failed', 'Unable to remove the agent at this time.');
            }
        }
    };

    // KPIs derived from actual backend fields
    const kpis = useMemo(() => {
        return {
            total: agents.length,
            available: agents.filter(a => a.status === 'available').length,
            busy: agents.filter(a => a.status === 'busy').length,
        };
    }, [agents]);

    // Access Check (Only Pharmacy Owners can manage agents currently as per backend)
    const isOwner = user?.role === 'pharmacy_owner';
    if (!isOwner) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center p-4 text-center">
                <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Access Denied</h2>
                <p className="mt-2 max-w-md text-gray-500 dark:text-gray-400">
                    You don't have permission to manage delivery agents. Please contact the pharmacy owner.
                </p>
                <div className="mt-6">
                    <Button variant="outline" onClick={() => window.location.href = '/pharmacy'}>
                        Back to Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Delivery Fleet Management</h1>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">
                        Manage your delivery agents and track fleet availability.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {loading && !isAdding && <Loader2 className="h-5 w-5 animate-spin text-orange-500" />}
                    <Button onClick={handleRefresh} variant="outline" size="sm" leftIcon={<RefreshCw className="h-4 w-4" />}>
                        Refresh
                    </Button>
                    <Button onClick={() => setIsAddDrawerOpen(true)} size="sm" leftIcon={<UserPlus className="h-4 w-4" />}>
                        Add Agent
                    </Button>
                </div>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
                    <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4"/> {error}</span>
                    <Button size="sm" variant="outline" onClick={handleRefresh}>Retry</Button>
                </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card className="flex items-center gap-4 p-4 border-l-4 border-l-blue-500">
                    <div className="rounded-full bg-blue-100 p-3 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        <Users className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Agents</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{kpis.total}</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4 p-4 border-l-4 border-l-green-500">
                    <div className="rounded-full bg-green-100 p-3 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Available</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{kpis.available}</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4 p-4 border-l-4 border-l-amber-500">
                    <div className="rounded-full bg-amber-100 p-3 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                        <Car className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Busy (On Delivery)</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{kpis.busy}</p>
                    </div>
                </Card>
            </div>

            {/* Agent Grid */}
            {loading && agents.length === 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="h-32 w-full animate-pulse bg-gray-200 dark:bg-gray-800"><div /></Card>
                    ))}
                </div>
            ) : agents.length === 0 ? (
                <Card padding="lg" className="border-dashed border-gray-300 dark:border-gray-700">
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        <Users className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
                        <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">No delivery agents yet</h3>
                        <p className="mt-1 text-sm">Add your first delivery agent to start managing pharmacy deliveries.</p>
                        <Button className="mt-4" onClick={() => setIsAddDrawerOpen(true)}>Add Agent</Button>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {agents.map((agent) => (
                        <Card 
                            key={agent.id} 
                            className="p-5 flex flex-col gap-4 hover:border-orange-300 dark:hover:border-orange-700 cursor-pointer transition-colors"
                            onClick={() => setSelectedAgent(agent)}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-100 text-lg font-bold text-orange-700 dark:bg-orange-900/40 dark:text-orange-400">
                                        {getInitials(agent.name)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-gray-100 truncate w-32 sm:w-40">{agent.name}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{agent.phone_number}</p>
                                    </div>
                                </div>
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                                    agent.status === 'available' 
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                }`}>
                                    {agent.status}
                                </span>
                            </div>

                            <div className="space-y-1.5 mt-2 text-sm text-gray-600 dark:text-gray-400">
                                {agent.vehicle_details && (
                                    <div className="flex items-center gap-2">
                                        <Car className="h-4 w-4 shrink-0 text-gray-400" />
                                        <span className="truncate">{agent.vehicle_details}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
                                    <span>{timeAgo(agent.last_location_update)}</span>
                                </div>
                            </div>

                            <div className="mt-auto flex gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                                <Button 
                                    variant="outline" 
                                    className="flex-1"
                                    onClick={(e) => { e.stopPropagation(); setSelectedAgent(agent); }}
                                >
                                    View Details
                                </Button>
                                <Button 
                                    variant="outline" 
                                    className="shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 dark:hover:bg-red-900/20"
                                    onClick={(e) => handleDelete(agent, e)}
                                    title="Delete Agent"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Add Agent Drawer */}
            {isAddDrawerOpen && (
                <div className="fixed inset-0 z-40 bg-black/50 transition-opacity" onClick={() => setIsAddDrawerOpen(false)}>
                    <div 
                        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-xl dark:bg-gray-900 animate-in slide-in-from-right duration-200" 
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-800">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <UserPlus className="h-5 w-5 text-orange-500" /> Add Delivery Agent
                                </h2>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Add a delivery agent to your pharmacy fleet.</p>
                            </div>
                            <button aria-label="Close" onClick={() => setIsAddDrawerOpen(false)} className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800 self-start">
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4">
                            <form id="add-agent-form" onSubmit={handleAddAgent} className="space-y-5">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 uppercase tracking-wider opacity-70">PERSONAL DETAILS</h3>
                                    <div className="space-y-4">
                                        <Input
                                            label="Full Name"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            placeholder="e.g. Rahul Kumar"
                                            required
                                            autoFocus
                                        />
                                        <Input
                                            label="Phone Number"
                                            value={newPhone}
                                            onChange={(e) => setNewPhone(e.target.value)}
                                            placeholder="10-digit mobile number"
                                            type="tel"
                                            required
                                        />
                                    </div>
                                </div>
                                <hr className="border-gray-200 dark:border-gray-800" />
                                <div>
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 uppercase tracking-wider opacity-70">VEHICLE INFORMATION</h3>
                                    <div className="space-y-4">
                                        <Input
                                            label="Vehicle Details (Optional)"
                                            value={newVehicle}
                                            onChange={(e) => setNewVehicle(e.target.value)}
                                            placeholder="e.g. Black Honda Activa • DL 04 AB 1234"
                                        />
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="border-t border-gray-200 p-4 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setIsAddDrawerOpen(false)} disabled={isAdding}>Cancel</Button>
                            <Button type="submit" form="add-agent-form" isLoading={isAdding} disabled={!newName.trim() || !newPhone.trim()}>
                                Save Agent
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Agent Details Drawer */}
            {selectedAgent && (
                <div className="fixed inset-0 z-40 bg-black/50 transition-opacity" onClick={() => setSelectedAgent(null)}>
                    <div 
                        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-xl dark:bg-gray-900 animate-in slide-in-from-right duration-200" 
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-800">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <BadgeInfo className="h-5 w-5 text-orange-500" /> Agent Profile
                            </h2>
                            <button aria-label="Close" onClick={() => setSelectedAgent(null)} className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800">
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Profile Header */}
                            <div className="flex flex-col items-center text-center">
                                <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-orange-100 text-3xl font-bold text-orange-700 dark:bg-orange-900/40 dark:text-orange-400">
                                    {getInitials(selectedAgent.name)}
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{selectedAgent.name}</h3>
                                <span className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                                    selectedAgent.status === 'available' 
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                }`}>
                                    Status: {selectedAgent.status}
                                </span>
                            </div>

                            <hr className="border-gray-200 dark:border-gray-800" />

                            {/* Contact Details */}
                            <div>
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Contact Information</h4>
                                <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Phone className="h-5 w-5 text-gray-400" />
                                        <span className="text-gray-900 dark:text-gray-100 font-medium">{selectedAgent.phone_number}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Vehicle Details */}
                            <div>
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Vehicle Information</h4>
                                <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                                    <div className="flex items-start gap-3">
                                        <Car className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
                                        <span className="text-gray-900 dark:text-gray-100">
                                            {selectedAgent.vehicle_details ? selectedAgent.vehicle_details : <span className="text-gray-500 italic">No vehicle details provided</span>}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Location Status */}
                            <div>
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Live Tracking</h4>
                                <div className="rounded-lg bg-blue-50 p-4 flex gap-3 items-start dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50">
                                    <Clock className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="block text-sm text-blue-900 dark:text-blue-200">Last Location Update</span>
                                        <span className="font-semibold text-blue-800 dark:text-blue-300">
                                            {timeAgo(selectedAgent.last_location_update)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-gray-200 p-4 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex justify-between gap-3">
                            <Button 
                                variant="outline" 
                                className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 dark:hover:bg-red-900/20"
                                onClick={() => handleDelete(selectedAgent)}
                                leftIcon={<Trash2 className="h-4 w-4" />}
                            >
                                Remove
                            </Button>
                            <Button variant="outline" onClick={() => setSelectedAgent(null)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog {...dialogProps} />
        </div>
    );
}
