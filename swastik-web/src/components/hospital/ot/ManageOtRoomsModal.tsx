'use client';

import React, { useState } from 'react';
import {
    X,
    Building2,
    Plus,
    Check,
    Loader2,
    AlertCircle,
    Power,
    Edit2
} from 'lucide-react';
import { hospitalApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

interface ManageOtRoomsModalProps {
    isOpen: boolean;
    onClose: () => void;
    rooms: any[];
    onRefresh: () => void;
}

export function ManageOtRoomsModal({
    isOpen,
    onClose,
    rooms,
    onRefresh,
}: ManageOtRoomsModalProps) {
    const toast = useToast();
    const [showAddForm, setShowAddForm] = useState(false);
    const [name, setName] = useState('');
    const [roomNumber, setRoomNumber] = useState('');
    const [roomType, setRoomType] = useState('major');
    const [floor, setFloor] = useState('');
    const [capacityNotes, setCapacityNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleCreateRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('OT Room Name is required');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const res = await hospitalApi.createOtRoom({
                name: name.trim(),
                roomNumber: roomNumber.trim() || undefined,
                roomType,
                floor: floor.trim() || undefined,
                capacityNotes: capacityNotes.trim() || undefined,
            });

            if (res && res.success) {
                toast.success('OT Room Added', `Operation Theatre ${name} created.`);
                setName('');
                setRoomNumber('');
                setFloor('');
                setCapacityNotes('');
                setShowAddForm(false);
                onRefresh();
            } else {
                setError(res?.message || 'Could not create OT room');
            }
        } catch (err: any) {
            setError(err.message || 'Could not create OT room');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (room: any) => {
        try {
            const res = await hospitalApi.updateOtRoom(room.id, {
                is_active: !room.is_active,
            });
            if (res && res.success) {
                toast.success('Status Updated', `${room.name} is now ${!room.is_active ? 'Active' : 'Under Maintenance'}.`);
                onRefresh();
            }
        } catch (err: any) {
            toast.error('Update Failed', err.message || 'Could not update room status');
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
                    onClick={onClose}
                />

                <div className="relative w-full max-w-xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-gray-800 p-6 z-10 space-y-4">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800 pb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold">
                                <Building2 className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                    Manage Operation Theatres (OT Rooms)
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    Configure surgical suites, room types, and maintenance status.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Room Roster */}
                    <div className="space-y-3 text-xs">
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                                Configured Theatres ({rooms.length})
                            </span>
                            {!showAddForm && (
                                <button
                                    type="button"
                                    onClick={() => setShowAddForm(true)}
                                    className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:underline cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>+ Add OT Room</span>
                                </button>
                            )}
                        </div>

                        {/* Add Form */}
                        {showAddForm && (
                            <form onSubmit={handleCreateRoom} className="p-4 bg-teal-50/50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 rounded-2xl space-y-3 animate-in fade-in">
                                <h4 className="font-bold text-teal-900 dark:text-teal-200 text-xs">
                                    New Operation Theatre Suite
                                </h4>

                                {error && (
                                    <div className="p-2 bg-rose-100 text-rose-800 rounded-xl text-[11px]">
                                        {error}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                                            Room Name <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. OT-01 Major, Cardiac OT"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                                            Room Number / Identifier
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Suite 301"
                                            value={roomNumber}
                                            onChange={(e) => setRoomNumber(e.target.value)}
                                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                                            Theatre Type
                                        </label>
                                        <select
                                            value={roomType}
                                            onChange={(e) => setRoomType(e.target.value)}
                                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
                                        >
                                            <option value="major">Major OT</option>
                                            <option value="minor">Minor OT</option>
                                            <option value="cardiac">Cardiac Theatre</option>
                                            <option value="neuro">Neuro Surgery Suite</option>
                                            <option value="ortho">Orthopaedic OT</option>
                                            <option value="ophthalmology">Eye / Ophthalmic OT</option>
                                            <option value="emergency">Emergency STAT OT</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                                            Floor / Wing
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 3rd Floor East"
                                            value={floor}
                                            onChange={(e) => setFloor(e.target.value)}
                                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddForm(false)}
                                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs inline-flex items-center gap-1"
                                    >
                                        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                        <span>Save OT Room</span>
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* List */}
                        <div className="space-y-2 max-h-72 overflow-y-auto">
                            {rooms.length === 0 ? (
                                <div className="p-6 text-center text-slate-400 bg-slate-50 dark:bg-gray-800/40 rounded-2xl">
                                    No Operation Theatres configured yet. Click "+ Add OT Room" to setup.
                                </div>
                            ) : (
                                rooms.map((r) => (
                                    <div
                                        key={r.id}
                                        className="p-3 bg-slate-50 dark:bg-gray-800/50 rounded-2xl border border-slate-200/70 dark:border-gray-800 flex items-center justify-between"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                                    {r.name}
                                                </span>
                                                <span className="px-1.5 py-0.2 rounded text-[10px] uppercase font-bold bg-teal-50 text-teal-700 border border-teal-200">
                                                    {r.room_type || 'Major'}
                                                </span>
                                                {r.floor && (
                                                    <span className="text-[10px] text-slate-400">
                                                        Floor {r.floor}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                Status: {r.is_active ? (
                                                    <span className="text-emerald-600 font-semibold">● Active & Operational</span>
                                                ) : (
                                                    <span className="text-amber-600 font-semibold">● Under Maintenance</span>
                                                )}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleToggleStatus(r)}
                                            className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-colors cursor-pointer border ${
                                                r.is_active
                                                    ? 'bg-white hover:bg-amber-50 text-amber-700 border-amber-200 dark:bg-gray-800 dark:border-gray-700'
                                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                                            }`}
                                        >
                                            {r.is_active ? 'Set Maintenance' : 'Mark Active'}
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="pt-2 flex justify-end border-t border-slate-100 dark:border-gray-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                            Close
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
