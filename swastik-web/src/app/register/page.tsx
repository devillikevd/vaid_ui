"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Role = "patient" | "doctor" | "hospital" | "clinic" | "pharmacy" | "lab" | "driver";

const roleColors: Record<Role, { bg: string, btn: string, btnHover: string, ring: string, tabBg: string, tabBorder: string, tabText: string, link: string, linkHover: string }> = {
  patient: { bg: "bg-blue-50", btn: "bg-blue-600", btnHover: "hover:bg-blue-700", ring: "focus:ring-blue-500", tabBg: "bg-blue-50", tabBorder: "border-blue-500", tabText: "text-blue-900", link: "text-blue-600", linkHover: "hover:text-blue-500" },
  doctor: { bg: "bg-indigo-50", btn: "bg-indigo-600", btnHover: "hover:bg-indigo-700", ring: "focus:ring-indigo-500", tabBg: "bg-indigo-50", tabBorder: "border-indigo-500", tabText: "text-indigo-900", link: "text-indigo-600", linkHover: "hover:text-indigo-500" },
  hospital: { bg: "bg-emerald-50", btn: "bg-emerald-600", btnHover: "hover:bg-emerald-700", ring: "focus:ring-emerald-500", tabBg: "bg-emerald-50", tabBorder: "border-emerald-500", tabText: "text-emerald-900", link: "text-emerald-600", linkHover: "hover:text-emerald-500" },
  clinic: { bg: "bg-teal-50", btn: "bg-teal-600", btnHover: "hover:bg-teal-700", ring: "focus:ring-teal-500", tabBg: "bg-teal-50", tabBorder: "border-teal-500", tabText: "text-teal-900", link: "text-teal-600", linkHover: "hover:text-teal-500" },
  pharmacy: { bg: "bg-orange-50", btn: "bg-orange-600", btnHover: "hover:bg-orange-700", ring: "focus:ring-orange-500", tabBg: "bg-orange-50", tabBorder: "border-orange-500", tabText: "text-orange-900", link: "text-orange-600", linkHover: "hover:text-orange-500" },
  lab: { bg: "bg-purple-50", btn: "bg-purple-600", btnHover: "hover:bg-purple-700", ring: "focus:ring-purple-500", tabBg: "bg-purple-50", tabBorder: "border-purple-500", tabText: "text-purple-900", link: "text-purple-600", linkHover: "hover:text-purple-500" },
  driver: { bg: "bg-rose-50", btn: "bg-rose-600", btnHover: "hover:bg-rose-700", ring: "focus:ring-rose-500", tabBg: "bg-rose-50", tabBorder: "border-rose-500", tabText: "text-rose-900", link: "text-rose-600", linkHover: "hover:text-rose-500" },
};

function RegisterForm() {
  const searchParams = useSearchParams();
  const initialRole = (searchParams.get("role") as Role) || "patient";
  const [selectedRole, setSelectedRole] = useState<Role>(initialRole);
  const theme = roleColors[selectedRole];

  const roles: { id: Role; label: string; icon: string }[] = [
    { id: "patient", label: "Patient", icon: "👤" },
    { id: "doctor", label: "Doctor", icon: "🩺" },
    { id: "hospital", label: "Hospital", icon: "🏥" },
    { id: "clinic", label: "Clinic", icon: "⚕️" },
    { id: "pharmacy", label: "Pharmacy", icon: "💊" },
    { id: "lab", label: "Diagnostic Lab", icon: "🔬" },
    { id: "driver", label: "Ambulance Driver", icon: "🚑" },
  ];

  useEffect(() => {
    if (searchParams.get("role")) {
      setSelectedRole(searchParams.get("role") as Role);
    }
  }, [searchParams]);

  return (
    <div className={`min-h-screen transition-colors duration-500 ${theme.bg} flex flex-col justify-center py-6 sm:px-6 lg:px-8 pt-24`}>
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 className="text-center text-3xl font-extrabold text-slate-900 transition-colors duration-300">
          Create an account
        </h2>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-[#ffffff] py-6 px-4 shadow-xl shadow-gray-200/50 sm:rounded-2xl sm:px-10 flex flex-col gap-6 border border-slate-100">
          
          {/* Top: Role Selector */}
          <div className="pb-4 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">Select Registration Type</h3>
            <div className="flex flex-wrap justify-center gap-2">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role.id)}
                  className={`text-center px-3 py-1.5 rounded-xl flex items-center gap-2 transition-all border ${
                    selectedRole === role.id
                      ? `${theme.tabBg} ${theme.tabBorder} ${theme.tabText} font-bold shadow-sm scale-[1.02]`
                      : "bg-[#ffffff] border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 opacity-70 hover:opacity-100"
                  }`}
                >
                  <span className="text-lg">{role.icon}</span>
                  <span className="text-sm">{role.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Bottom: Register Form */}
          <div>

            <form className="space-y-4" action="#" method="POST" onSubmit={(e) => e.preventDefault()}>
              
              <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="name" className="block text-sm font-medium text-slate-700 transition-colors">
                    {selectedRole === "patient" || selectedRole === "doctor" || selectedRole === "driver" ? "Full Name" : "Business Name"}
                  </label>
                  <div className="mt-1">
                    <input id="name" name="name" type="text" required className={`appearance-none block w-full px-3 py-3 border border-slate-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all sm:text-sm ${theme.ring}`} placeholder="Enter name" />
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-slate-700 transition-colors">Mobile Number</label>
                  <div className="mt-1">
                    <input id="phone" name="phone" type="text" required className={`appearance-none block w-full px-3 py-3 border border-slate-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all sm:text-sm ${theme.ring}`} placeholder="10 digit number" />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 transition-colors">Email Address</label>
                  <div className="mt-1">
                    <input id="email" name="email" type="email" required className={`appearance-none block w-full px-3 py-3 border border-slate-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all sm:text-sm ${theme.ring}`} placeholder="Enter email" />
                  </div>
                </div>

                {selectedRole !== "patient" && (
                  <div className="sm:col-span-2 animate-in fade-in slide-in-from-top-4 duration-300">
                    <label htmlFor="location" className="block text-sm font-medium text-slate-700 transition-colors">City / Location</label>
                    <div className="mt-1">
                      <input id="location" name="location" type="text" required className={`appearance-none block w-full px-3 py-3 border border-slate-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all sm:text-sm ${theme.ring}`} placeholder="Enter operating city" />
                    </div>
                  </div>
                )}
                
                {selectedRole === "doctor" && (
                  <div className="sm:col-span-2 animate-in fade-in slide-in-from-top-4 duration-300">
                    <label htmlFor="specialty" className="block text-sm font-medium text-slate-700 transition-colors">Medical Specialty</label>
                    <div className="mt-1">
                      <input id="specialty" name="specialty" type="text" required className={`appearance-none block w-full px-3 py-3 border border-slate-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all sm:text-sm ${theme.ring}`} placeholder="e.g., Cardiologist, Ayurvedic Physician" />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <button
                  type="submit"
                  className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-all duration-300 transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 mt-4 ${theme.btn} ${theme.btnHover} ${theme.ring}`}
                >
                  Create Account
                </button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-[#ffffff] text-slate-500">
                    Already have an account?
                  </span>
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <Link href="/login" className={`font-medium transition-colors ${theme.link} ${theme.linkHover}`}>
                  Back to Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
