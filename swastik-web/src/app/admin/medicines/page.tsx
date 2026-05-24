'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload, Download, Loader2, Package } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { downloadCSV } from '@/utils/export';
import { parseCSV } from '@/utils/csvParser';
import { useAdminMedicinesStore } from '@/stores/adminMedicinesStore';

export default function AdminMedicinesPage() {
    const { medicines, loading, fetchMedicines, addBulkMedicines } = useAdminMedicinesStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const toast = useToast();

    useEffect(() => {
        void fetchMedicines(1, searchQuery);
    }, [fetchMedicines, searchQuery]);

    const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const csvText = event.target?.result as string;
            const parsedData = parseCSV(csvText);
            
            if (parsedData.length === 0) {
                toast.error('Invalid CSV', 'No data found in the CSV file');
                return;
            }

            setIsImporting(true);
            const success = await addBulkMedicines(parsedData);
            if (success) {
                toast.success('Import Successful', `Successfully imported ${parsedData.length} medicines into the global catalog.`);
            }
            setIsImporting(false);
            
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Global Medicine Catalog</h1>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">Manage the master list of medicines available across the platform.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImportCSV} 
                        accept=".csv" 
                        className="hidden" 
                    />
                    <Button
                        variant="outline"
                        onClick={() => downloadCSV([], [
                            { key: 'name', label: 'name' },
                            { key: 'generic_name', label: 'generic_name' },
                            { key: 'manufacturer', label: 'manufacturer' },
                            { key: 'category', label: 'category' },
                            { key: 'subcategory', label: 'subcategory' },
                            { key: 'description', label: 'description' },
                            { key: 'form', label: 'form' },
                            { key: 'dosage_form', label: 'dosage_form' },
                            { key: 'strength', label: 'strength' },
                            { key: 'pack_size', label: 'pack_size' },
                            { key: 'price', label: 'price' },
                            { key: 'mrp', label: 'mrp' },
                            { key: 'requires_prescription', label: 'requires_prescription' },
                        ], 'global_medicines_template')}
                        leftIcon={<Download className="h-4 w-4" />}
                    >
                        Template
                    </Button>
                    <Button
                        onClick={() => fileInputRef.current?.click()}
                        leftIcon={isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        disabled={isImporting}
                    >
                        {isImporting ? 'Importing...' : 'Import CSV'}
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex-1 max-w-md">
                    <Input
                        placeholder="Search medicines..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <Card padding="none">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
                            <tr>
                                <th className="px-4 py-3 font-medium">Medicine</th>
                                <th className="px-4 py-3 font-medium">Category</th>
                                <th className="px-4 py-3 font-medium">Price</th>
                                <th className="px-4 py-3 font-medium">Rx Req</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-gray-500">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : medicines.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-gray-500">
                                        No medicines found in the catalog.
                                    </td>
                                </tr>
                            ) : (
                                medicines.map((med) => (
                                    <tr key={med.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="rounded-lg bg-blue-100 p-2"><Package className="h-4 w-4 text-blue-600" /></div>
                                                <div>
                                                    <span className="font-medium text-gray-900">{med.name}</span>
                                                    {med.manufacturer && <p className="text-xs text-gray-400">{med.manufacturer}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{med.category || '—'}</td>
                                        <td className="px-4 py-3 text-gray-600">₹{med.price || 0}</td>
                                        <td className="px-4 py-3 text-gray-600">{med.requires_prescription ? 'Yes' : 'No'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
