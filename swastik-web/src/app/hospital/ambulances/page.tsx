'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Ambulance, Mail, Loader2, Trash2, CheckCircle, Clock } from 'lucide-react';
import { hospitalApi } from '@/lib/api';

export default function HospitalAmbulancesPage() {
    const [ambulances, setAmbulances] = useState<any[]>([]);
    const [invites, setInvites] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await hospitalApi.getAffiliatedAmbulances();
            if (res.success) {
                // The backend returns { ambulances: [...], pendingInvites: [...] }
                setAmbulances(Array.isArray(res.ambulances) ? res.ambulances : []);
                setInvites(Array.isArray(res.pendingInvites) ? res.pendingInvites : []);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch ambulances');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setInviteLoading(true);
        try {
            const res = await hospitalApi.inviteAmbulance(email);
            if (res.success) {
                setSuccess('Invite sent successfully');
                setEmail('');
                fetchData();
            } else {
                setError(res.error || 'Failed to send invite');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to send invite');
        } finally {
            setInviteLoading(false);
        }
    };

    const handleRemove = async (ambulanceId: string) => {
        if (!confirm('Are you sure you want to remove this ambulance?')) return;
        try {
            const res = await hospitalApi.removeAffiliatedAmbulance(ambulanceId);
            if (res.success) {
                fetchData();
            } else {
                setError(res.error || 'Failed to remove ambulance');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to remove ambulance');
        }
    };

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Affiliated Ambulances</h1>
                    <p className="text-gray-500">Manage ambulances linked to your hospital for direct dispatch.</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm border border-red-200">
                    {error}
                </div>
            )}
            
            {success && (
                <div className="bg-green-50 text-green-600 p-4 rounded-lg text-sm border border-green-200">
                    {success}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Mail className="w-5 h-5 text-teal-600" />
                                Invite Ambulance
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleInvite} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Driver Email</label>
                                    <Input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="driver@example.com"
                                    />
                                    <p className="text-xs text-gray-500 mt-2">
                                        The driver will receive an invite in their Ambulance App dashboard.
                                    </p>
                                </div>
                                <Button type="submit" disabled={inviteLoading} className="w-full bg-teal-600 hover:bg-teal-700">
                                    {inviteLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                    Send Invite
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Ambulance className="w-5 h-5 text-teal-600" />
                                Affiliated Ambulances ({ambulances.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {ambulances.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    No affiliated ambulances yet.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {ambulances.map((amb) => (
                                        <div key={amb.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold text-gray-900">{amb.vehicle_number}</h3>
                                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                        <CheckCircle className="w-3 h-3"/> Active
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 mt-1">{amb.driver_name} • {amb.driver_phone}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">{amb.vehicle_type}</p>
                                            </div>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="text-red-600 border-red-200 hover:bg-red-50"
                                                onClick={() => handleRemove(amb.id)}
                                            >
                                                <Trash2 className="w-4 h-4 mr-1" />
                                                Remove
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {invites.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-amber-600" />
                                    Pending Invites ({invites.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {invites.map((invite) => (
                                        <div key={invite.id} className="flex items-center justify-between p-3 border rounded-lg">
                                            <div>
                                                <p className="font-medium text-gray-900">{invite.driver_email}</p>
                                                <p className="text-xs text-gray-500">
                                                    Sent: {new Date(invite.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-md">
                                                Pending Acceptance
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
