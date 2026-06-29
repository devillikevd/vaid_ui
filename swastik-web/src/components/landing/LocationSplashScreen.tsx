"use client";

import React, { useEffect, useState } from "react";

export default function LocationSplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [status, setStatus] = useState<"detecting" | "found" | "denied">("detecting");
  const [location, setLocation] = useState<string>("");

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return;

    // Check if splash was already shown in this session
    const hasSeenSplash = sessionStorage.getItem("hasSeenSplash");
    if (hasSeenSplash) {
      setIsVisible(false);
      return;
    }

    let isMounted = true;

    const fetchLocation = async (lat: number, lon: number) => {
      try {
        const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
        const data = await response.json();
        
        if (!isMounted) return;

        let cityStr = "";
        if (data.city) cityStr = data.city;
        else if (data.locality) cityStr = data.locality;
        else cityStr = "Unknown City";
        
        const stateStr = data.principalSubdivision || data.countryName || "";
        
        setLocation(`${cityStr}${stateStr ? `, ${stateStr}` : ""}`);
        setStatus("found");
        
        finishSplash();
      } catch (error) {
        if (isMounted) fallbackLocation();
      }
    };

    const fallbackLocation = () => {
      if (!isMounted) return;
      setLocation("India");
      setStatus("denied");
      finishSplash();
    };

    const finishSplash = () => {
      setTimeout(() => {
        if (!isMounted) return;
        setIsExiting(true);
        setTimeout(() => {
          if (!isMounted) return;
          setIsVisible(false);
          sessionStorage.setItem("hasSeenSplash", "true");
        }, 1000); // Wait for the fade-out transition
      }, 1500); // Display the result for 1.5 seconds
    };

    // Ask for geolocation
    if (navigator.geolocation) {
      // Set a timeout in case the user ignores the prompt for too long
      const timeoutId = setTimeout(() => {
        if (isMounted && status === "detecting") {
          fallbackLocation();
        }
      }, 6000);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          fetchLocation(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          clearTimeout(timeoutId);
          fallbackLocation();
        },
        { timeout: 5000 }
      );
    } else {
      fallbackLocation();
    }

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#ffffff] backdrop-blur-3xl transition-opacity duration-1000 ${isExiting ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
      
      {/* Radar Animation */}
      <div className="relative flex items-center justify-center mb-10">
        <div className={`absolute w-32 h-32 rounded-full border-2 border-brand-primary/30 ${status === 'detecting' ? 'animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite]' : 'opacity-0 transition-opacity duration-1000'}`}></div>
        <div className={`absolute w-48 h-48 rounded-full border-2 border-brand-primary/20 ${status === 'detecting' ? 'animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite_0.5s]' : 'opacity-0 transition-opacity duration-1000'}`}></div>
        <div className={`absolute w-64 h-64 rounded-full border border-brand-primary/10 ${status === 'detecting' ? 'animate-[ping_3.5s_cubic-bezier(0,0,0.2,1)_infinite_1s]' : 'opacity-0 transition-opacity duration-1000'}`}></div>
        
        {/* Main Location Icon Container */}
        <div className={`w-24 h-24 bg-gradient-to-br from-brand-primary to-blue-500 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.4)] z-10 transition-transform duration-700 ${status === 'detecting' ? 'animate-pulse' : 'scale-110'}`}>
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.242-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
      </div>

      {/* Text Area */}
      <div className="text-center z-10 px-6">
        <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight font-outfit">
          Vaididea <span className="text-brand-primary">Network</span>
        </h2>
        
        <div className="h-12 flex items-center justify-center">
          {status === "detecting" && (
            <p className="text-lg md:text-xl font-medium text-slate-500 flex items-center gap-3 animate-pulse">
              <svg className="w-6 h-6 animate-spin text-brand-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Auto-detecting your location...
            </p>
          )}
          
          {(status === "found" || status === "denied") && (
            <p className="text-2xl md:text-3xl font-bold text-brand-primary animate-fade-in-up flex items-center gap-2">
              <span className="text-slate-800 font-medium text-xl md:text-2xl">Located in</span> {location}
            </p>
          )}
        </div>
      </div>

      {/* Brand Watermark */}
      <div className="absolute bottom-10 text-slate-400 font-bold tracking-widest text-sm uppercase flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
        Securing Smart Healthcare
      </div>
    </div>
  );
}
