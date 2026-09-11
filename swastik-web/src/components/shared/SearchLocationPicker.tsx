"use client";

import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import {
  MapPin,
  Search,
  Navigation,
  X,
  Loader2,
  Check,
  AlertCircle,
  Building2,
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

export interface SelectedLocation {
  city?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  displayName: string;
  source?: "gps" | "search" | "popular";
}

interface SearchLocationPickerProps {
  value: SelectedLocation | null;
  onChange: (location: SelectedLocation | null) => void;
  placeholder?: string;
  className?: string;
  popoverClassName?: string;
  buttonClassName?: string;
  align?: "left" | "right" | "center";
}

export const POPULAR_CITIES: { name: string; state: string; lat: number; lng: number }[] = [
  { name: "Delhi", state: "Delhi", lat: 28.6139, lng: 77.2090 },
  { name: "Noida", state: "Uttar Pradesh", lat: 28.5355, lng: 77.3910 },
  { name: "Gurugram", state: "Haryana", lat: 28.4595, lng: 77.0266 },
  { name: "Ghaziabad", state: "Uttar Pradesh", lat: 28.6692, lng: 77.4538 },
  { name: "Chandigarh", state: "Chandigarh", lat: 30.7333, lng: 76.7794 },
  { name: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462 },
  { name: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873 },
  { name: "Mumbai", state: "Maharashtra", lat: 19.0760, lng: 72.8777 },
  { name: "Bengaluru", state: "Karnataka", lat: 12.9716, lng: 77.5946 },
  { name: "Hyderabad", state: "Telangana", lat: 17.3850, lng: 78.4867 },
];

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    neighbourhood?: string;
    county?: string;
    state_district?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

export default function SearchLocationPicker({
  value,
  onChange,
  placeholder = "City / Pincode",
  className = "",
  popoverClassName = "",
  buttonClassName = "",
  align = "left",
}: SearchLocationPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Portal positioning state
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  // SSR guard: only use createPortal after mount
  const [isMounted, setIsMounted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(searchQuery.trim(), 350);

  // Mark mounted for SSR safety
  useEffect(() => { setIsMounted(true); }, []);

  // Compute portal position whenever the picker opens, and on scroll/resize
  const computePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const POPOVER_HEIGHT = 420; // estimated max height
    const GAP = 6;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < POPOVER_HEIGHT && rect.top > POPOVER_HEIGHT;

    setPopoverStyle({
      position: "fixed",
      zIndex: 9999,
      top: openUpward ? rect.top - GAP : rect.bottom + GAP,
      left: rect.left,
      width: Math.max(rect.width, 300),
      // Shift right if it would overflow the right edge
      ...(rect.left + Math.max(rect.width, 300) > window.innerWidth
        ? { left: window.innerWidth - Math.max(rect.width, 300) - 8 }
        : {}),
      // Translate upward by full height if opening upward
      ...(openUpward ? { transform: "translateY(-100%)" } : {}),
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    computePosition();
    window.addEventListener("scroll", computePosition, true);
    window.addEventListener("resize", computePosition);
    return () => {
      window.removeEventListener("scroll", computePosition, true);
      window.removeEventListener("resize", computePosition);
    };
  }, [isOpen, computePosition]);

  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
      setSearchResults([]);
      setGpsError(null);
      setSearchError(null);
    }
  }, [isOpen]);

  // Click outside to close — checks both the trigger container and the portal popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const insideTrigger = containerRef.current?.contains(target);
      const insidePopover = popoverRef.current?.contains(target);
      if (!insideTrigger && !insidePopover) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen]);

  // Perform search when debouncedQuery changes
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    let isMounted = true;
    setIsSearching(true);
    setSearchError(null);

    const controller = new AbortController();

    async function fetchLocations() {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          debouncedQuery
        )}&format=json&addressdetails=1&limit=6&countrycodes=in`;

        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            "Accept-Language": "en",
          },
        });

        if (!res.ok) {
          throw new Error("Unable to load locations. Try again.");
        }

        const data: NominatimResult[] = await res.json();
        if (isMounted) {
          setSearchResults(Array.isArray(data) ? data : []);
          setIsSearching(false);
        }
      } catch (err: any) {
        if (err.name !== "AbortError" && isMounted) {
          setSearchError("Unable to load locations. Try again.");
          setIsSearching(false);
        }
      }
    }

    fetchLocations();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [debouncedQuery]);

  // Reverse geocode lat/lng to human-readable address
  const reverseGeocode = async (
    lat: number,
    lng: number
  ): Promise<{ city: string; displayName: string; pincode?: string }> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        {
          headers: { "Accept-Language": "en" },
        }
      );
      if (!res.ok) throw new Error("Geocode failed");
      const data: NominatimResult = await res.json();
      const addr = data.address || {};
      const cityName =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.suburb ||
        addr.county ||
        addr.state_district ||
        "";
      const stateName = addr.state || "";
      const pincode = addr.postcode || "";

      let displayName = cityName;
      if (displayName && stateName && displayName !== stateName) {
        displayName = `${displayName}, ${stateName}`;
      } else if (!displayName && data.display_name) {
        displayName = data.display_name.split(",").slice(0, 2).join(",").trim();
      }

      return {
        city: cityName || "Current Location",
        displayName: displayName || "Current Location",
        pincode,
      };
    } catch {
      return {
        city: "Current Location",
        displayName: "Current Location",
      };
    }
  };

  // GPS Current Location Detection
  const handleUseCurrentLocation = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      return;
    }

    setIsGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        try {
          const resolved = await reverseGeocode(lat, lng);
          onChange({
            city: resolved.city,
            pincode: resolved.pincode,
            latitude: lat,
            longitude: lng,
            displayName: resolved.displayName || "Current Location",
            source: "gps",
          });
          setIsOpen(false);
        } catch {
          onChange({
            city: "Current Location",
            latitude: lat,
            longitude: lng,
            displayName: "Current Location",
            source: "gps",
          });
          setIsOpen(false);
        } finally {
          setIsGpsLoading(false);
        }
      },
      (err) => {
        setIsGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError("Location permission was denied. Search your city or pincode instead.");
        } else {
          setGpsError("Unable to detect your GPS position. Please select a city manually.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, [onChange]);

  // Select a popular city
  const handleSelectPopularCity = (city: typeof POPULAR_CITIES[0]) => {
    onChange({
      city: city.name,
      latitude: city.lat,
      longitude: city.lng,
      displayName: `${city.name}, ${city.state}`,
      source: "popular",
    });
    setIsOpen(false);
  };

  // Select a search result
  const handleSelectSearchResult = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const addr = result.address || {};

    const cityName =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.suburb ||
      addr.county ||
      addr.state_district ||
      "";
    const stateName = addr.state || "";
    const pincode = addr.postcode || "";

    let primaryName = cityName || pincode;
    if (!primaryName) {
      primaryName = result.display_name.split(",")[0].trim();
    }

    let displayName = primaryName;
    if (stateName && displayName !== stateName && !displayName.includes(stateName)) {
      displayName = `${displayName}, ${stateName}`;
    }

    onChange({
      city: cityName || primaryName,
      pincode: pincode || undefined,
      latitude: !isNaN(lat) ? lat : undefined,
      longitude: !isNaN(lng) ? lng : undefined,
      displayName: displayName || result.display_name.split(",").slice(0, 2).join(",").trim(),
      source: "search",
    });
    setIsOpen(false);
  };

  // Clear location
  const handleClearLocation = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/*
       * Trigger Area — a div (not a button) so we can nest real <button> elements
       * inside without violating the button-in-button accessibility rule.
       */}
      <div
        ref={triggerRef}
        className={`w-full flex items-center justify-between gap-1 group ${buttonClassName}`}
      >
        {/* Left: click to open dropdown */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label={
            value
              ? `Location: ${value.displayName}. Click to change`
              : "Select location"
          }
          className="flex items-center gap-1.5 min-w-0 flex-1 text-left focus:outline-none cursor-pointer"
        >
          <MapPin
            className={`w-3.5 h-3.5 shrink-0 transition-colors ${
              isGpsLoading
                ? "text-amber-500"
                : value
                ? "text-emerald-600"
                : gpsError
                ? "text-amber-500"
                : "text-vd-forest group-hover:text-vd-forest-deep"
            }`}
          />
          <span
            className={`text-xs font-medium truncate ${
              value
                ? "text-stone-900 font-semibold"
                : gpsError
                ? "text-amber-700"
                : "text-stone-500"
            }`}
            title={
              value?.displayName ||
              (gpsError ? gpsError : placeholder)
            }
          >
            {isGpsLoading
              ? "Detecting location..."
              : value
              ? value.displayName
              : gpsError
              ? gpsError.includes("denied")
                ? "Location access denied"
                : "Unable to detect location"
              : placeholder}
          </span>
        </button>

        {/* Right: contextual action(s) */}
        {isGpsLoading ? (
          /* GPS in progress — spinner only */
          <div className="flex items-center gap-1 shrink-0 px-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500 shrink-0" />
          </div>
        ) : value ? (
          /* Location selected — Change + Clear */
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              aria-label="Change location"
              className="text-[10px] font-semibold text-vd-forest hover:text-vd-forest-deep px-1.5 py-0.5 rounded hover:bg-emerald-50 transition-colors cursor-pointer whitespace-nowrap focus:outline-none"
            >
              Change
            </button>
            <button
              type="button"
              onClick={handleClearLocation}
              aria-label="Clear location"
              title="Clear location"
              className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer focus:outline-none"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          /* No location — Prominent "Use my location" button with GPS navigation icon */
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isGpsLoading}
            aria-label="Use my location"
            title="Detect my current location via GPS"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold text-vd-forest hover:text-vd-forest-deep bg-emerald-50 hover:bg-emerald-100/90 border border-emerald-200/70 transition-colors cursor-pointer disabled:opacity-50 shrink-0 select-none"
          >
            <Navigation className="w-2.5 h-2.5 text-vd-forest" />
            <span>Use my location</span>
          </button>
        )}
      </div>

      {/* Popover / Dropdown Menu — rendered via portal to escape ancestor overflow clipping */}
      {isOpen && isMounted && createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Location Picker"
          style={popoverStyle}
          className={`w-[300px] sm:w-[340px] bg-white rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.16)] border border-stone-200/90 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 ${popoverClassName}`}
        >
          {/* Top Search Input Header */}
          <div className="p-3 border-b border-stone-100 bg-stone-50/70">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search city or pincode..."
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-vd-forest focus:ring-2 focus:ring-emerald-500/10 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 p-1 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100"
                  aria-label="Clear search input"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Current Location Quick Action */}
          <div className="p-2 border-b border-stone-100">
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isGpsLoading}
              className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-left hover:bg-emerald-50/80 transition-colors group cursor-pointer disabled:opacity-60"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-100/70 text-vd-forest flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-vd-forest group-hover:text-white transition-colors">
                {isGpsLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Navigation className="w-3.5 h-3.5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-stone-900 group-hover:text-vd-forest flex items-center gap-1.5">
                  <span>Use my current location</span>
                  {value?.source === "gps" && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-bold">
                      Active
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-stone-500 font-light">
                  {isGpsLoading ? "Detecting GPS coordinates..." : "Detect location automatically"}
                </div>
              </div>
            </button>

            {gpsError && (
              <div className="mt-1.5 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200/80 text-[11px] text-amber-800 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600 mt-0.5" />
                <span>{gpsError}</span>
              </div>
            )}
          </div>

          {/* Body Content: Search Results OR Popular Cities */}
          <div className="max-h-[260px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-stone-200">
            {/* Searching indicator */}
            {isSearching && (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-stone-500">
                <Loader2 className="w-4 h-4 animate-spin text-vd-forest" />
                <span>Searching locations...</span>
              </div>
            )}

            {/* Search error */}
            {!isSearching && searchError && (
              <div className="px-3 py-4 text-center text-xs text-amber-700">
                <p>{searchError}</p>
              </div>
            )}

            {/* Empty Search Results */}
            {!isSearching && !searchError && debouncedQuery.length >= 2 && searchResults.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-stone-500">
                <p className="font-medium text-stone-700">No locations found</p>
                <p className="text-[11px] text-stone-400 mt-1">
                  Try searching with a different city name or 6-digit pincode.
                </p>
              </div>
            )}

            {/* Dynamic Search Results */}
            {!isSearching && searchResults.length > 0 && (
              <div className="space-y-0.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 px-2.5 py-1">
                  Matching Locations
                </div>
                {searchResults.map((result) => {
                  const addr = result.address || {};
                  const title =
                    addr.city ||
                    addr.town ||
                    addr.village ||
                    addr.suburb ||
                    addr.postcode ||
                    result.display_name.split(",")[0];
                  const subtitle = [addr.suburb, addr.city || addr.town, addr.state, addr.postcode]
                    .filter(Boolean)
                    .filter((item, idx, arr) => arr.indexOf(item) === idx && item !== title)
                    .slice(0, 3)
                    .join(", ");

                  const isSelected = value?.displayName === title || value?.city === title;

                  return (
                    <button
                      key={result.place_id}
                      type="button"
                      onClick={() => handleSelectSearchResult(result)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left hover:bg-stone-50 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 group-hover:text-vd-forest shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-stone-900 group-hover:text-vd-forest truncate">
                            {title}
                          </div>
                          {subtitle && (
                            <div className="text-[11px] text-stone-500 font-light truncate">
                              {subtitle}
                            </div>
                          )}
                        </div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-vd-forest shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Popular Cities Suggestions (when search is empty) */}
            {(!debouncedQuery || debouncedQuery.length < 2) && (
              <div>
                <div className="flex items-center justify-between px-2.5 py-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    <span>Popular Cities</span>
                  </span>
                  <span className="text-[10px] text-stone-400 font-light">Quick pick</span>
                </div>

                <div className="grid grid-cols-2 gap-1 mt-1">
                  {POPULAR_CITIES.map((city) => {
                    const isSelected =
                      value?.city?.toLowerCase() === city.name.toLowerCase();

                    return (
                      <button
                        key={city.name}
                        type="button"
                        onClick={() => handleSelectPopularCity(city)}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs transition-colors group cursor-pointer ${
                          isSelected
                            ? "bg-emerald-50 text-vd-forest font-bold border border-emerald-200/80"
                            : "bg-stone-50/60 hover:bg-emerald-50/50 text-stone-700 hover:text-vd-forest border border-transparent"
                        }`}
                      >
                        <span className="truncate">{city.name}</span>
                        {isSelected && <Check className="w-3 h-3 text-vd-forest shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
