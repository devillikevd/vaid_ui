'use client';

import React, { useEffect, useState } from 'react';
import { Package, Search, CheckCircle, AlertTriangle, AlertCircle, Plus } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { API_BASE_URL } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

export default function UnmappedInventoryPage() {
    const accessToken = useAuthStore(state => state.accessToken);
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [unmappedRecords, setUnmappedRecords] = useState<any[]>([]);
    
    const [showModal, setShowModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [mapping, setMapping] = useState(false);

    useEffect(() => {
        fetchUnmapped();
    }, [accessToken]);

    const fetchUnmapped = async () => {
        if (!accessToken) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/unmapped-inventory`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const data = await res.json();
            if (data.success) {
                setUnmappedRecords(data.data || []);
            }
        } catch (err) {
            toast.error('Failed to load unmapped records');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setSearching(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/medicines?search=${encodeURIComponent(searchQuery)}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const data = await res.json();
            if (data.success) {
                setSearchResults(data.data || []);
            }
        } catch (err) {
            toast.error('Failed to search master catalog');
        } finally {
            setSearching(false);
        }
    };

    const handleMap = async (medicineId: string) => {
        if (!selectedRecord) return;
        setMapping(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/unmapped-inventory/map`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    inventoryId: selectedRecord.id,
                    medicineId
                })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Successfully mapped legacy record!');
                setShowModal(false);
                setSelectedRecord(null);
                setSearchQuery('');
                setSearchResults([]);
                fetchUnmapped();
            } else {
                toast.error(data.error?.message || 'Mapping failed');
            }
        } catch (err) {
            toast.error('Mapping request failed');
        } finally {
            setMapping(false);
        }
    };

    const openModal = (record: any) => {
        setSelectedRecord(record);
        setSearchQuery(record.name || '');
        setSearchResults([]);
        setShowModal(true);
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-6">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <AlertTriangle className="h-6 w-6 text-yellow-500" />
                        Unmapped Legacy Inventory
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Resolve legacy pharmacy inventory records that are not linked to the master catalog.
                    </p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="overflow-x-auto w-full max-w-full">
                    <table className="w-full text-left text-sm min-w-[640px]">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400">
                            <tr>
                                <th className="px-4 py-3 font-medium">Pharmacy</th>
                                <th className="px-4 py-3 font-medium">Legacy Name</th>
                                <th className="px-4 py-3 font-medium">Generic / Manufacturer</th>
                                <th className="px-4 py-3 font-medium">Stock / Price</th>
                                <th className="px-4 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {unmappedRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                        <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                                        No unmapped records found. All inventory is correctly linked.
                                    </td>
                                </tr>
                            ) : (
                                unmappedRecords.map((record) => (
                                    <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                            {record.pharmacy?.name || 'Unknown'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-gray-900 dark:text-gray-100">{record.name}</div>
                                            <div className="text-xs text-gray-500 font-mono">ID: {record.id.slice(0, 8)}...</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-gray-900 dark:text-gray-200">{record.generic_name || '-'}</div>
                                            <div className="text-xs text-gray-500">{record.manufacturer || '-'}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-gray-900 dark:text-gray-200">Qty: {record.quantity || 0}</div>
                                            <div className="text-xs text-gray-500">₹{record.price || 0}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => openModal(record)}
                                                className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors inline-flex items-center gap-1.5"
                                            >
                                                <Package className="h-4 w-4" />
                                                Map to Master
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MAPPING MODAL */}
            {showModal && selectedRecord && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[92dvh] flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Map Legacy Record</h2>
                                <p className="text-sm text-gray-500">Find a master medicine for <span className="font-semibold text-gray-700 dark:text-gray-300">"{selectedRecord.name}"</span></p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none">&times;</button>
                        </div>
                        
                        <div className="p-4 flex-1 overflow-y-auto">
                            <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search master catalog..."
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                                    />
                                </div>
                                <button type="submit" disabled={searching} className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50">
                                    {searching ? 'Searching...' : 'Search'}
                                </button>
                            </form>

                            {searchResults.length > 0 ? (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Select Master Medicine</h3>
                                    {searchResults.map(med => (
                                        <div key={med.id} className={`p-4 rounded-lg border ${med.is_active ? 'border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer' : 'border-red-200 bg-red-50 dark:bg-red-900/10 opacity-75'}`} onClick={() => med.is_active && handleMap(med.id)}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                                        {med.name}
                                                        {!med.is_active && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Inactive</span>}
                                                    </div>
                                                    <div className="text-sm text-gray-500 mt-1">{med.generic_name || '-'}</div>
                                                    <div className="text-xs text-gray-400 mt-1">{med.manufacturer || '-'} | {med.dosage_form || '-'}</div>
                                                </div>
                                                <button 
                                                    disabled={mapping || !med.is_active}
                                                    className="px-3 py-1.5 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                                                    onClick={(e) => { e.stopPropagation(); handleMap(med.id); }}
                                                >
                                                    {mapping ? 'Mapping...' : 'Map'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 border-dashed">
                                    <AlertCircle className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No master medicine found</h3>
                                    <p className="text-sm text-gray-500 mt-1 mb-4">Try adjusting your search terms.</p>
                                    <a href="/admin/medicines" target="_blank" className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 inline-flex items-center gap-2 text-gray-700 dark:text-gray-300 shadow-sm">
                                        <Plus className="h-4 w-4" />
                                        Create New Master Medicine
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
