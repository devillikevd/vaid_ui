import { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, Clock } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { diagnosticCenterApi } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';

const HISTORY_KEY = 'diagnostic_master_catalog_search_history';
const MAX_HISTORY = 10;

interface DiagnosticMasterCatalogSearchProps {
    onSelect: (test: any) => void;
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

export function DiagnosticMasterCatalogSearch({ onSelect }: DiagnosticMasterCatalogSearchProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [searchHistory, setSearchHistory] = useState<any[]>(loadHistory);
    
    const debouncedQuery = useDebounce(query, 300);

    const addToHistory = useCallback((test: any) => {
        setSearchHistory(prev => {
            const filtered = prev.filter(h => h.id !== test.id);
            const updated = [test, ...filtered].slice(0, MAX_HISTORY);
            saveHistory(updated);
            return updated;
        });
    }, []);

    const clearHistory = useCallback(() => {
        setSearchHistory([]);
        saveHistory([]);
    }, []);

    const handleSelect = useCallback((test: any) => {
        addToHistory(test);
        onSelect(test);
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
                const res = await diagnosticCenterApi.searchMasterTests(debouncedQuery, undefined, 1);
                if (res.success) {
                    setResults((res.data as any[]) || []);
                    setIsOpen(true);
                }
            } catch (e) {
                console.error("Failed to fetch tests from master catalog", e);
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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-brand-500 z-10" />
                <Input
                    type="text"
                    placeholder="Search Master Catalog to Auto-fill (e.g. CBC, Lipid Profile)..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-10 pr-10 border-brand-300 dark:border-brand-700 focus:ring-brand-500 bg-brand-50 dark:bg-brand-900/20 placeholder:text-brand-400 h-12 text-base"
                    onFocus={() => { 
                        if (results.length > 0) setIsOpen(true);
                        else if (query.length < 2 && searchHistory.length > 0) setIsOpen(true);
                    }}
                />
                {loading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-brand-500 z-10" />
                )}
            </div>
            
            {isOpen && results.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {results.map((test) => (
                        <button
                            key={test.id}
                            type="button"
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0 flex items-center gap-3 transition-colors"
                            onClick={() => handleSelect(test)}
                        >
                            {test.image_url ? (
                                <img src={test.image_url} alt={test.name} className="h-10 w-10 rounded object-cover flex-shrink-0" />
                            ) : (
                                <div className="h-10 w-10 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 text-slate-400 font-medium">
                                    {test.name.charAt(0)}
                                </div>
                            )}
                            <div>
                                <div className="font-medium text-slate-900 dark:text-white">{test.name}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                    {test.category} • Pre-requisites: {test.preparation_instructions || 'None'}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {showHistory && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Recent Searches
                        </span>
                        <button
                            type="button"
                            onClick={clearHistory}
                            className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                        >
                            Clear
                        </button>
                    </div>
                    {searchHistory.map((test) => (
                        <button
                            key={test.id}
                            type="button"
                            className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0 flex items-center gap-3 transition-colors"
                            onClick={() => handleSelect(test)}
                        >
                            <Clock className="h-4 w-4 text-slate-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-slate-900 dark:text-white text-sm truncate">{test.name}</div>
                                <div className="text-xs text-slate-500 truncate">{test.category}</div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
