import React, { useState, useEffect } from 'react';
import { X, Check, MapPin, Loader2 } from 'lucide-react';
import LocationPicker from './LocationPickerDynamic';

interface AddressData {
    address: string;
    city: string;
    state: string;
    pincode: string;
}

interface LocationMapModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (lat: number, lng: number, addressData?: AddressData) => void;
    initialLatitude?: number | null;
    initialLongitude?: number | null;
    initialAddressText?: string; // To seed the map search if no lat/lng
}

export function LocationMapModal({
    isOpen,
    onClose,
    onConfirm,
    initialLatitude,
    initialLongitude,
    initialAddressText,
}: LocationMapModalProps) {
    const [lat, setLat] = useState<number | null>(initialLatitude ?? null);
    const [lng, setLng] = useState<number | null>(initialLongitude ?? null);
    
    const [isReversing, setIsReversing] = useState(false);
    const [reverseError, setReverseError] = useState('');
    const [resolvedAddress, setResolvedAddress] = useState<AddressData | null>(null);

    // Sync initial state when modal opens
    useEffect(() => {
        if (isOpen) {
            setLat(initialLatitude ?? null);
            setLng(initialLongitude ?? null);
            setResolvedAddress(null);
            setReverseError('');
        }
    }, [isOpen, initialLatitude, initialLongitude]);

    const reverseGeocode = async (latitude: number, longitude: number) => {
        setIsReversing(true);
        setReverseError('');
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
                { headers: { 'User-Agent': 'VaidideaHealthApp/1.0' } }
            );
            const data = await res.json();
            
            if (data && data.address) {
                const addr = data.address;
                const city = addr.city || addr.town || addr.village || addr.county || '';
                const state = addr.state || '';
                const pincode = addr.postcode || '';
                
                // Construct a readable address line
                const addressParts = [];
                if (addr.amenity) addressParts.push(addr.amenity);
                if (addr.road) addressParts.push(addr.road);
                if (addr.suburb || addr.neighbourhood) addressParts.push(addr.suburb || addr.neighbourhood);
                
                const addressText = addressParts.length > 0 
                    ? addressParts.join(', ') 
                    : data.display_name.split(',').slice(0, 2).join(', ');

                setResolvedAddress({
                    address: addressText,
                    city,
                    state,
                    pincode
                });
            } else {
                setReverseError('Could not fetch address for this location.');
                setResolvedAddress(null);
            }
        } catch (error) {
            setReverseError('Failed to fetch address. Please check your connection.');
            setResolvedAddress(null);
        }
        setIsReversing(false);
    };

    const handleLocationChange = (newLat: number, newLng: number) => {
        if (newLat === 0 && newLng === 0) {
            // Cleared
            setLat(null);
            setLng(null);
            setResolvedAddress(null);
            return;
        }
        setLat(newLat);
        setLng(newLng);
        // Debounce reverse geocoding slightly or just trigger it
        reverseGeocode(newLat, newLng);
    };

    const handleConfirm = () => {
        if (lat == null || lng == null || (lat === 0 && lng === 0)) {
            // Cannot confirm empty
            return;
        }
        onConfirm(lat, lng, resolvedAddress || undefined);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            
            <div className="relative w-full max-w-2xl bg-white dark:bg-[#0f0f13] border border-gray-200 dark:border-[rgba(255,255,255,0.1)] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 dark:border-[rgba(255,255,255,0.05)]">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Pin Clinic Location</h3>
                        <p className="text-sm text-gray-500 dark:text-[#A1A1AA]">Search or drag the pin to your exact clinic location</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body - Map */}
                <div className="p-4 sm:p-5 flex-1 overflow-y-auto">
                    <LocationPicker 
                        latitude={lat}
                        longitude={lng}
                        onLocationChange={handleLocationChange}
                        address={initialAddressText}
                        height="400px"
                        accentColor="green"
                        label="Interactive Map"
                    />

                    {/* Reverse Geocoding Results */}
                    <div className="mt-4 min-h-[80px]">
                        {isReversing && (
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-[#A1A1AA] bg-gray-50 dark:bg-[#09090B]/50 p-4 rounded-xl border border-gray-100 dark:border-[rgba(255,255,255,0.05)]">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Fetching address details...</span>
                            </div>
                        )}
                        
                        {!isReversing && reverseError && (
                            <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 p-4 rounded-xl border border-amber-200 dark:border-amber-500/20">
                                {reverseError}
                            </div>
                        )}

                        {!isReversing && resolvedAddress && (
                            <div className="bg-[#22C55E]/10 border border-[#22C55E]/20 p-4 rounded-xl">
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 mb-1">
                                    <MapPin className="w-4 h-4 text-[#22C55E]" />
                                    Location Found
                                </h4>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    {resolvedAddress.address && <span className="block">{resolvedAddress.address}</span>}
                                    <span className="block opacity-80">
                                        {[resolvedAddress.city, resolvedAddress.state, resolvedAddress.pincode].filter(Boolean).join(', ')}
                                    </span>
                                </p>
                                <p className="text-xs text-[#22C55E] mt-2 font-medium">
                                    You can review and edit these details before saving.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-[rgba(255,255,255,0.05)] bg-gray-50 dark:bg-[#09090B]/30 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-[#18181B] border border-gray-300 dark:border-[rgba(255,255,255,0.1)] rounded-xl hover:bg-gray-50 dark:hover:bg-[#27272A] transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={lat == null || lng == null || (lat === 0 && lng === 0) || isReversing}
                        className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#22C55E] to-[#16A34A] rounded-xl hover:from-[#16A34A] hover:to-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                    >
                        <Check className="w-4 h-4" />
                        Confirm Location
                    </button>
                </div>
            </div>
        </div>
    );
}
