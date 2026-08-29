/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
import { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, Clock, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { medicineApi } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';

const HISTORY_KEY = 'master_catalog_search_history';
const MAX_HISTORY = 10;

interface MasterCatalogSearchProps {
    onSelect: (medicine: any) => void;
}

function loadHistory(): any[] {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function saveHistory(items: any[]) {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(items)); } catch {}
}

export function MasterCatalogSearch({ onSelect }: MasterCatalogSearchProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [searchHistory, setSearchHistory] = useState<any[]>(loadHistory);
    
    const debouncedQuery = useDebounce(query, 300);

    const addToHistory = useCallback((med: any) => {
        setSearchHistory(prev => {
            const filtered = prev.filter(h => h.id !== med.id);
            const updated = [med, ...filtered].slice(0, MAX_HISTORY);
            saveHistory(updated);
            return updated;
        });
    }, []);

    const clearHistory = useCallback(() => {
        setSearchHistory([]);
        saveHistory([]);
    }, []);

    const handleSelect = useCallback((med: any) => {
        addToHistory(med);
        onSelect(med);
        setQuery('');
        setIsOpen(false);
    }, [addToHistory, onSelect]);

    useEffect(() => {
        if (debouncedQuery.length < 2) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        const fetchResults = async () => {
            setLoading(true);
            try {
                const res = await medicineApi.search(debouncedQuery, {}, 1);
                if (res.success) {
                    setResults((res.data as any[]) || []);
                    setIsOpen(true);
                }
            } catch (e) {
                console.error("Failed to fetch medicines from master catalog", e);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [debouncedQuery]);

    const showHistory = isOpen && results.length === 0 && !loading && query.length < 2 && searchHistory.length > 0;

    return (
        <div className="relative w-full mb-6">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-orange-500 z-10" />
                <Input
                    type="text"
                    placeholder="Search by medicine name or generic name..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-10 pr-10 border-gray-300 dark:border-gray-700 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 h-12 text-base"
                    onFocus={() => { 
                        if (results.length > 0) setIsOpen(true);
                        else if (query.length < 2 && searchHistory.length > 0) setIsOpen(true);
                    }}
                />
                {loading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-orange-500 z-10" />
                )}
            </div>
            
            {isOpen && results.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {results.map((med) => (
                        <button
                            key={med.id}
                            type="button"
                            className="w-full text-left px-4 py-3 hover:bg-orange-50/50 dark:hover:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800 last:border-0 flex items-center gap-3 transition-colors"
                            onClick={() => handleSelect(med)}
                        >
                            {med.image_url ? (
                                <img src={med.image_url} alt={med.name} className="h-10 w-10 rounded object-cover flex-shrink-0 border border-gray-100 dark:border-gray-800" />
                            ) : (
                                <div className="h-10 w-10 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 text-gray-400 dark:text-gray-500 font-medium">
                                    {med.name.charAt(0)}
                                </div>
                            )}
                            <div>
                                <div className="font-medium text-gray-900 dark:text-gray-100">{med.name}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {med.generic_name || 'No generic name'}{med.mrp ? ` • MRP: ₹${med.mrp}` : ''}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {showHistory && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Recent Searches
                        </span>
                        <button
                            type="button"
                            onClick={clearHistory}
                            className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        >
                            Clear
                        </button>
                    </div>
                    {searchHistory.map((med) => (
                        <button
                            key={med.id}
                            type="button"
                            className="w-full text-left px-4 py-2.5 hover:bg-orange-50/50 dark:hover:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800 last:border-0 flex items-center gap-3 transition-colors"
                            onClick={() => handleSelect(med)}
                        >
                            <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{med.name}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{med.generic_name || 'No generic name'}</div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
