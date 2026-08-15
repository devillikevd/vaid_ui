import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Search, Plus, ChevronDown } from 'lucide-react';

interface MultiSelectProps {
    label: string;
    icon?: React.ReactNode;
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
    allowCustom?: boolean;
    primaryOption?: string | null;
    onPrimaryChange?: (primary: string | null) => void;
    requirePrimary?: boolean;
    error?: string;
}

export function MultiSelect({
    label,
    icon,
    options,
    selected,
    onChange,
    placeholder = 'Select...',
    allowCustom = true,
    primaryOption,
    onPrimaryChange,
    requirePrimary = false,
    error,
}: MultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [customValue, setCustomValue] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearch('');
                setCustomValue('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleSelection = (option: string) => {
        if (selected.includes(option)) {
            onChange(selected.filter(i => i !== option));
            if (primaryOption === option && onPrimaryChange) {
                onPrimaryChange(null);
            }
        } else {
            onChange([...selected, option]);
            if (requirePrimary && !primaryOption && onPrimaryChange) {
                onPrimaryChange(option);
            }
        }
    };

    const addCustomOption = () => {
        const val = customValue.trim();
        if (!val) return;
        
        // Prevent exact duplicates case-insensitively
        const exists = selected.some(s => s.toLowerCase() === val.toLowerCase());
        if (!exists) {
            onChange([...selected, val]);
            if (requirePrimary && !primaryOption && onPrimaryChange) {
                onPrimaryChange(val);
            }
        }
        setCustomValue('');
        setSearch('');
        inputRef.current?.focus();
    };

    const clearAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange([]);
        if (onPrimaryChange) {
            onPrimaryChange(null);
        }
    };

    const filteredOptions = options.filter(opt => 
        opt.toLowerCase().includes(search.toLowerCase())
    );

    // Make sure custom selected options that aren't in the base options list appear when searching
    const customSelectedOptions = selected.filter(sel => !options.includes(sel));
    const allFilteredOptions = [
        ...filteredOptions, 
        ...customSelectedOptions.filter(opt => opt.toLowerCase().includes(search.toLowerCase()))
    ];
    
    // Remove duplicates
    const uniqueFilteredOptions = Array.from(new Set(allFilteredOptions));

    return (
        <div className="space-y-2 relative" ref={containerRef}>
            <label className="text-sm font-medium text-[#A1A1AA] flex items-center justify-between">
                <span>{label}</span>
                {selected.length > 0 && (
                    <button 
                        type="button" 
                        onClick={clearAll}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                        Clear all
                    </button>
                )}
            </label>

            <div 
                className={`relative group rounded-xl bg-[#09090B]/50 border transition-all cursor-text
                    ${isOpen ? 'border-[#22C55E] ring-1 ring-[#22C55E]/50' : error ? 'border-red-500/50' : 'border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)]'}
                `}
                onClick={() => {
                    setIsOpen(true);
                    inputRef.current?.focus();
                }}
            >
                <div className="absolute top-3.5 left-0 pl-3.5 flex items-start pointer-events-none">
                    {icon}
                </div>
                
                <div className="min-h-[48px] py-2 pl-[42px] pr-10 flex flex-wrap gap-2 items-center">
                    {selected.map((item) => (
                        <div 
                            key={item} 
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm border transition-colors ${
                                primaryOption === item 
                                ? 'bg-[#22C55E]/20 border-[#22C55E]/50 text-white' 
                                : 'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.1)] text-[#E4E4E7]'
                            }`}
                        >
                            {requirePrimary && onPrimaryChange && (
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onPrimaryChange(item); }}
                                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                        primaryOption === item 
                                        ? 'border-[#22C55E] bg-[#22C55E]' 
                                        : 'border-[#A1A1AA] hover:border-white'
                                    }`}
                                    title="Mark as Primary"
                                >
                                    {primaryOption === item && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                </button>
                            )}
                            <span className="truncate max-w-[150px] sm:max-w-[200px]">{item}</span>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); toggleSelection(item); }}
                                className="p-0.5 hover:bg-[rgba(255,255,255,0.1)] rounded-md transition-colors"
                            >
                                <X className="w-3.5 h-3.5 text-[#A1A1AA] hover:text-white" />
                            </button>
                        </div>
                    ))}
                    
                    <input
                        ref={inputRef}
                        type="text"
                        className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-white placeholder:text-[#A1A1AA]/50 text-sm py-1"
                        placeholder={selected.length === 0 ? placeholder : 'Add more...'}
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            if (!isOpen) setIsOpen(true);
                        }}
                    />
                </div>
                
                <div className="absolute top-3.5 right-0 pr-3.5 flex items-center pointer-events-none">
                    <ChevronDown className={`w-5 h-5 text-[#A1A1AA] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {error && (
                <p className="text-red-500 text-xs mt-1">{error}</p>
            )}

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 w-full mt-1 bg-[#18181B] border border-[rgba(255,255,255,0.1)] rounded-xl shadow-2xl overflow-hidden"
                    >
                        <div className="max-h-60 overflow-y-auto hide-scrollbar py-2">
                            {uniqueFilteredOptions.length > 0 ? (
                                uniqueFilteredOptions.map((opt) => {
                                    const isSelected = selected.includes(opt);
                                    return (
                                        <div
                                            key={opt}
                                            onClick={() => toggleSelection(opt)}
                                            className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors hover:bg-[rgba(255,255,255,0.05)] ${
                                                isSelected ? 'bg-[#22C55E]/5' : ''
                                            }`}
                                        >
                                            <span className={`text-sm ${isSelected ? 'text-[#22C55E] font-medium' : 'text-[#E4E4E7]'}`}>
                                                {opt}
                                            </span>
                                            {isSelected && <Check className="w-4 h-4 text-[#22C55E]" />}
                                        </div>
                                    );
                                })
                            ) : (
                                !allowCustom && (
                                    <div className="px-4 py-3 text-sm text-[#A1A1AA] text-center">
                                        No options found
                                    </div>
                                )
                            )}
                        </div>
                        
                        {allowCustom && (
                            <div className="p-3 border-t border-[rgba(255,255,255,0.05)] bg-[#09090B]">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Add custom option..."
                                        value={customValue}
                                        onChange={(e) => setCustomValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                addCustomOption();
                                            }
                                        }}
                                        className="flex-1 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22C55E] transition-colors"
                                    />
                                    <button
                                        type="button"
                                        onClick={addCustomOption}
                                        disabled={!customValue.trim()}
                                        className="bg-[#22C55E] text-white p-2 rounded-lg disabled:opacity-50 hover:bg-[#16A34A] transition-colors"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
