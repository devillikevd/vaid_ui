import { useState, useEffect } from 'react';
import { Lock, Smartphone, Clock, XCircle, LogOut, Loader2 } from 'lucide-react';
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
            <label className="block text-[13px] font-bold text-gray-400 mb-2 uppercase tracking-wide">
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
        <div className="space-y-12">
            {/* Change Password */}
            <div>
                <SectionLabel>Change Password</SectionLabel>
                <div className="max-w-md space-y-5 bg-white dark:bg-[#131A2B] p-7 rounded-3xl border border-gray-200 dark:border-gray-800/50 shadow-sm transition-all hover:border-gray-300 dark:hover:border-gray-700/50">
                    <FieldRow label="Current Password">
                        <Input type="password" value={passwords.current} onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))} placeholder="Enter current password" />
                    </FieldRow>
                    <FieldRow label="New Password">
                        <Input type="password" value={passwords.new} onChange={e => setPasswords(p => ({ ...p, new: e.target.value }))} placeholder="Min. 8 characters" />
                    </FieldRow>
                    <FieldRow label="Confirm New Password">
                        <Input type="password" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} placeholder="Re-enter new password" />
                    </FieldRow>
                    <div className="pt-2">
                        <Button onClick={handleChangePassword} isLoading={isSavingPassword} leftIcon={<Lock className="h-4 w-4" />} className="w-full h-12 text-[15px]">Update Password</Button>
                    </div>
                </div>
                <div className="mt-6 p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 to-transparent border-l-4 border-amber-500 text-[15px] font-medium text-amber-500 max-w-md flex gap-4 items-center">
                    <span className="text-2xl shrink-0">🔐</span>
                    <p className="leading-relaxed">Changing your password will automatically log you out from all other active devices.</p>
                </div>
            </div>

            {/* Active Sessions */}
            <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <SectionLabel>Active Sessions</SectionLabel>
                    <Button variant="danger" size="sm" onClick={handleLogoutAll} leftIcon={<LogOut className="h-4 w-4" />} className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border-0 transition-all">
                        Log out all other devices
                    </Button>
                </div>
                
                {isLoadingSessions ? (
                    <div className="flex justify-center p-12 bg-white dark:bg-[#131A2B] rounded-3xl border border-gray-200 dark:border-gray-800/50">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {sessions.length === 0 ? (
                            <div className="col-span-full p-12 text-[15px] font-medium text-gray-500 text-center bg-white dark:bg-[#131A2B] rounded-3xl border border-gray-200 dark:border-gray-800/50 shadow-sm flex flex-col items-center gap-3">
                                <Smartphone className="w-10 h-10 text-gray-700" />
                                No active sessions found.
                            </div>
                        ) : (
                            sessions.map(session => (
                                <div key={session.id} className="bg-white dark:bg-[#131A2B] p-6 rounded-3xl border border-gray-200 dark:border-gray-800/50 flex flex-col gap-5 shadow-sm transition-all hover:border-gray-300 dark:hover:border-gray-700/50">
                                    <div className="flex items-start gap-4">
                                        <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 shrink-0 border border-emerald-500/20">
                                            <Smartphone className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[16px] font-bold text-gray-900 dark:text-gray-100 truncate">
                                                {session.device_info || 'Unknown Device'}
                                            </p>
                                            <div className="flex flex-col gap-1.5 mt-2.5">
                                                <span className="text-[13px] font-semibold text-gray-500 flex items-center gap-2">
                                                    IP Address: <span className="text-gray-300 font-mono">{session.ip_address || 'Unknown'}</span>
                                                </span>
                                                <span className="text-[13px] font-semibold text-gray-500 flex items-center gap-2">
                                                    <Clock className="h-4 w-4 text-gray-600" /> 
                                                    Last active: <span className="text-gray-400">{formatDate(session.last_active)}</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end mt-auto pt-2 border-t border-gray-200 dark:border-gray-800/50">
                                        <Button variant="ghost" size="sm" onClick={() => handleLogoutDevice(session.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-9 px-4 rounded-xl mt-2">
                                            <XCircle className="h-4 w-4 mr-2" /> Revoke Access
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Login History */}
            <div>
                <SectionLabel>Recent Login History</SectionLabel>
                {isLoadingSessions ? (
                    <div className="flex justify-center p-12 bg-white dark:bg-[#131A2B] rounded-3xl border border-gray-200 dark:border-gray-800/50">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                    </div>
                ) : (
                    <div className="bg-white dark:bg-[#131A2B] rounded-3xl border border-gray-200 dark:border-gray-800/50 shadow-sm overflow-hidden transition-all hover:border-gray-300 dark:hover:border-gray-700/50">
                        {history.length === 0 ? (
                            <div className="p-12 text-[15px] font-medium text-gray-500 text-center flex flex-col items-center gap-3">
                                <Clock className="w-10 h-10 text-gray-700" />
                                No login history found.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left whitespace-nowrap">
                                    <thead className="text-[12px] font-bold uppercase tracking-widest text-gray-500 bg-gray-50 dark:bg-[#0B1020]/50 border-b border-gray-200 dark:border-gray-800/50">
                                        <tr>
                                            <th className="px-8 py-5">Status</th>
                                            <th className="px-8 py-5">Date & Time</th>
                                            <th className="px-8 py-5">Device Info</th>
                                            <th className="px-8 py-5">IP Address</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800/50">
                                        {history.map((log) => (
                                            <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-[#1A2235] transition-colors">
                                                <td className="px-8 py-5">
                                                    {log.status === 'success' ? (
                                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                                            Success
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest bg-red-500/10 text-red-500 border border-red-500/20">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                                            Failed
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-8 py-5 text-[14px] font-medium text-gray-600 dark:text-gray-400">
                                                    {formatDate(log.created_at)}
                                                </td>
                                                <td className="px-8 py-5 text-[15px] font-bold text-gray-800 dark:text-gray-200">
                                                    {log.device_info || 'Unknown'}
                                                </td>
                                                <td className="px-8 py-5 text-[14px] font-medium text-gray-500 font-mono">
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
