import React from 'react';
import { Play } from 'lucide-react';

export default function Hero() {
  return (
    <div className="bg-[#F3F4F6] w-full font-sans min-h-screen pt-20">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-20 relative">
        
        {/* Top Split Section */}
        <div className="flex flex-col md:flex-row items-center justify-between min-h-[500px]">
          
          {/* Left Side - Typography */}
          <div className="w-full md:w-1/2 flex flex-col justify-center pb-20 md:pb-0 z-10">
            <h1 className="text-[#222] font-serif text-[60px] md:text-[80px] leading-[1.1] tracking-tight">
              Your All-in-One <br/>
              <span className="italic text-[#2B6A60]">Healthcare</span> Ecosystem
            </h1>
            
            <p className="text-gray-600 mt-6 text-xl max-w-md font-medium">
              Find Doctors, Book Appointments, Order Medicines, and Manage Records – All in One Place.
            </p>

            {/* Added Features: Search Bar */}
            <div className="mt-10 bg-white p-2 rounded-full flex items-center w-full max-w-lg shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-gray-200">
              <div className="flex-1 flex items-center px-4">
                <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <input 
                  type="text" 
                  placeholder="Doctor, Speciality, Clinic, City, State..." 
                  className="w-full outline-none text-[15px] text-gray-700 bg-transparent placeholder-gray-400"
                  suppressHydrationWarning
                />
              </div>
              <button className="bg-[#2B6A60] hover:bg-[#1E5B53] text-white px-6 py-2.5 rounded-full text-sm font-bold transition-colors shadow-md">
                Search Doctor
              </button>
            </div>

            {/* Added Features: App Buttons */}
            <div className="mt-8 flex items-center gap-4">
              <button className="bg-[#111827] text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-black transition-colors shadow-md border border-gray-800">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.19 2.24-.86 3.44-.86 1.81.08 3.09.84 3.96 2.05-1.57 1.05-1.29 3.23.16 4.09-.85 2.1-1.89 4.38-2.64 6.89M12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                <span className="text-sm font-bold tracking-wide">App Store</span>
              </button>
              <button className="bg-[#111827] text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-black transition-colors shadow-md border border-gray-800">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M3.609 1.814L13.792 12 3.61 22.186c-.165-.133-.314-.306-.436-.525C2.932 21.218 2.8 20.672 2.8 20.015V3.985c0-.657.132-1.203.374-1.646.122-.219.271-.392.435-.525zm11.134 11.137l3.753-3.753-12.79-7.382 9.037 11.135zm.952.952l-9.036 11.136 12.79-7.383-3.754-3.753zm4.613-4.614l-3.661 3.662 3.66 3.662c.983-.566 1.661-1.378 1.661-2.455 0-1.077-.678-1.889-1.66-2.455z"/></svg>
                <span className="text-sm font-bold tracking-wide">Google Play</span>
              </button>
            </div>
          </div>

          {/* Right Side - Image */}
          <div className="w-full md:w-1/2 absolute right-0 top-0 h-full flex justify-end">
            <img 
              src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=1200&auto=format&fit=crop" 
              alt="Healthcare Professional" 
              className="object-cover object-top h-[600px] w-auto max-w-[800px] mix-blend-darken"
            />
          </div>
        </div>

        {/* Horizontal Line */}
        <div className="w-full h-px bg-black my-8 relative z-10"></div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-10 text-center relative z-10">
          <div>
            <div className="text-5xl font-bold text-[#222] mb-2">12+</div>
            <div className="text-xs tracking-widest text-gray-500 font-bold uppercase">Years of Experience</div>
          </div>
          <div>
            <div className="text-5xl font-bold text-[#222] mb-2">95%</div>
            <div className="text-xs tracking-widest text-gray-500 font-bold uppercase">Patient Satisfaction</div>
          </div>
          <div>
            <div className="text-5xl font-bold text-[#222] mb-2">2.5K</div>
            <div className="text-xs tracking-widest text-gray-500 font-bold uppercase">Happy Patients</div>
          </div>
          <div>
            <div className="text-5xl font-bold text-[#222] mb-2">24/7</div>
            <div className="text-xs tracking-widest text-gray-500 font-bold uppercase">Patient Support</div>
          </div>
        </div>

      </div>
    </div>
  );
}
