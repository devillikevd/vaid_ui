import { useState, useEffect } from 'react';
import { Lock, Smartphone, Clock, XCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { authApi } from '@/lib/api';

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-4 mt-2">
            {children}
        </p>
    );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {label}
            </label>
            {children}
        </div>
    );
}

export function SecuritySettings({ showStatus }: { showStatus: (type: 'success' | 'error', msg: string) => void }) {
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    
    const [sessions, setSessions] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [isLoadingSessions, setIsLoadingSessions] = useState(true);

    useEffect(() => {
        loadSecurityData();
    }, []);

    const loadSecurityData = async () => {
        try {
            const [sessionsRes, historyRes] = await Promise.all([
                authApi.getSessions(),
                authApi.getLoginHistory()
            ]);
            if (sessionsRes.success) setSessions(sessionsRes.data as any[]);
            if (historyRes.success) setHistory(historyRes.data as any[]);
        } catch (error) {
            console.error('Failed to load security data', error);
        } finally {
            setIsLoadingSessions(false);
        }
    };

    const handleChangePassword = async () => {
        if (passwords.new !== passwords.confirm) { showStatus('error', 'New passwords do not match.'); return; }
        if (passwords.new.length < 8) { showStatus('error', 'Password must be at least 8 characters.'); return; }
        setIsSavingPassword(true);
        try {
            const res = await authApi.changePassword(passwords.current, passwords.new);
            if (res.success) {
                showStatus('success', 'Password changed successfully! You have been logged out of other devices.');
                setPasswords({ current: '', new: '', confirm: '' });
                loadSecurityData();
            } else {
                showStatus('error', (res as any).error || 'Failed to change password');
            }
        } catch { showStatus('error', 'Network error.'); }
        setIsSavingPassword(false);
    };

    const handleLogoutDevice = async (sessionId: string) => {
        if (!confirm('Are you sure you want to log out this device?')) return;
        try {
            const res = await authApi.logoutDevice(sessionId);
            if (res.success) {
                showStatus('success', 'Device logged out.');
                loadSecurityData();
            } else {
                showStatus('error', 'Failed to log out device.');
            }
        } catch { showStatus('error', 'Network error.'); }
    };

    const handleLogoutAll = async () => {
        if (!confirm('Log out from all other devices?')) return;
        try {
            const res = await authApi.logoutAllDevices();
            if (res.success) {
                showStatus('success', 'Logged out of all other devices.');
                loadSecurityData();
            } else {
                showStatus('error', 'Failed to log out other devices.');
            }
        } catch { showStatus('error', 'Network error.'); }
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="space-y-8">
            {/* Change Password */}
            <div>
                <SectionLabel>Change Password</SectionLabel>
                <div className="max-w-sm space-y-4 bg-gray-50 dark:bg-gray-800/30 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <FieldRow label="Current Password">
                        <Input type="password" value={passwords.current} onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))} placeholder="Enter current password" />
                    </FieldRow>
                    <FieldRow label="New Password">
                        <Input type="password" value={passwords.new} onChange={e => setPasswords(p => ({ ...p, new: e.target.value }))} placeholder="Min. 8 characters" />
                    </FieldRow>
                    <FieldRow label="Confirm New Password">
                        <Input type="password" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} placeholder="Re-enter new password" />
                    </FieldRow>
                    <Button variant="outline" onClick={handleChangePassword} isLoading={isSavingPassword} leftIcon={<Lock className="h-4 w-4" />} className="w-full mt-2">Update Password</Button>
                </div>
                <div className="mt-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-400 max-w-sm">
                    🔐 Changing your password will automatically log you out from all other devices.
                </div>
            </div>

            {/* Active Sessions */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <SectionLabel>Active Sessions</SectionLabel>
                    <Button variant="danger" size="sm" onClick={handleLogoutAll} leftIcon={<LogOut className="h-4 w-4" />}>
                        Log out all other devices
                    </Button>
                </div>
                
                {isLoadingSessions ? (
                    <p className="text-sm text-gray-500">Loading sessions...</p>
                ) : (
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                        {sessions.length === 0 ? (
                            <div className="p-4 text-sm text-gray-500 text-center">No active sessions found.</div>
                        ) : (
                            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                                {sessions.map(session => (
                                    <li key={session.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                                                <Smartphone className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {session.device_info || 'Unknown Device'}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                                        IP: {session.ip_address || 'Unknown'}
                                                    </span>
                                                    <span className="text-xs text-gray-300 dark:text-gray-600">•</span>
                                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                                        <Clock className="h-3 w-3" /> 
                                                        Last active: {formatDate(session.last_active)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => handleLogoutDevice(session.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                            <XCircle className="h-4 w-4 mr-2" /> Revoke
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>

            {/* Login History */}
            <div>
                <SectionLabel>Recent Login History</SectionLabel>
                {isLoadingSessions ? (
                    <p className="text-sm text-gray-500">Loading history...</p>
                ) : (
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                        {history.length === 0 ? (
                            <div className="p-4 text-sm text-gray-500 text-center">No login history found.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800/50 uppercase border-b border-gray-200 dark:border-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 font-medium">Status</th>
                                            <th className="px-6 py-3 font-medium">Date & Time</th>
                                            <th className="px-6 py-3 font-medium">Device Info</th>
                                            <th className="px-6 py-3 font-medium">IP Address</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {history.map((log) => (
                                            <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {log.status === 'success' ? (
                                                        <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                                            Success
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                                            Failed
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                                    {formatDate(log.created_at)}
                                                </td>
                                                <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                                                    {log.device_info || 'Unknown'}
                                                </td>
                                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                                    {log.ip_address || 'Unknown'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
