'use client';

import React from 'react';
import Link from 'next/link';
import {
    X,
    Building2,
    Stethoscope,
    User,
    Calendar,
    Activity,
    ExternalLink,
    Edit2,
    Trash2,
    ShieldCheck,
    CheckCircle2,
    Clock,
    Users,
    Video
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface DepartmentDetailsDrawerProps {
    department: any | null;
    doctorsInDept: any[];
    isOpen: boolean;
    onClose: () => void;
    onEdit: (dept: any) => void;
    onDelete: (deptId: string, deptName: string) => void;
    canManageDepartments?: boolean;
}

export function DepartmentDetailsDrawer({
    department,
    doctorsInDept,
    isOpen,
    onClose,
    onEdit,
    onDelete,
    canManageDepartments = true,
}: DepartmentDetailsDrawerProps) {
    if (!isOpen || !department) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
                onClick={onClose}
                aria-hidden="true"
            />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                <div className="w-screen max-w-xl bg-white dark:bg-gray-900 shadow-2xl border-l border-slate-200 dark:border-gray-800 flex flex-col animate-in slide-in-from-right duration-200">
                    
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between bg-slate-50/70 dark:bg-gray-800/40">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-extrabold font-mono text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-lg border border-teal-200/60 dark:border-teal-800">
                                    {department.id ? `DEPT-${department.id.slice(0, 8).toUpperCase()}` : 'DEPT'}
                                </span>
                                <StatusBadge status={department.status || 'active'} size="sm" />
                            </div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                                Department Clinical Workspace
                            </h2>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:hover:bg-gray-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">

                        {/* 1. Department Overview Card */}
                        <div className="p-4 bg-slate-50/80 dark:bg-gray-800/50 rounded-2xl border border-slate-200/70 dark:border-gray-800 space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-xs border border-teal-700/20">
                                    <Building2 className="w-6 h-6" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                                        {department.name}
                                    </h3>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                        {department.description || 'Clinical department providing specialized medical care.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 2. Department Leadership & Head Doctor */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                <span>Department Leadership</span>
                            </h4>
                            <div className="p-3.5 bg-slate-50/80 dark:bg-gray-800/50 rounded-2xl border border-slate-200/70 dark:border-gray-800 space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500">Head of Department:</span>
                                    <span className="font-bold text-slate-900 dark:text-slate-100">
                                        {department.head ? `Dr. ${department.head}` : 'No Head Assigned'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-200/50 dark:border-gray-700/50">
                                    <span className="text-slate-500">Total Affiliated Doctors:</span>
                                    <span className="font-bold text-teal-700 dark:text-teal-400 font-mono">
                                        {department.doctors || doctorsInDept.length} Doctors
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-200/50 dark:border-gray-700/50">
                                    <span className="text-slate-500">Operational Status:</span>
                                    <span className="font-semibold text-emerald-600 capitalize">
                                        {department.status || 'Active'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 3. Clinical Operations & Scheduled Activity */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                <span>Clinical Operations & Queue</span>
                            </h4>
                            <div className="p-3.5 bg-slate-50/80 dark:bg-gray-800/50 rounded-2xl border border-slate-200/70 dark:border-gray-800 space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500">Today's Appointments:</span>
                                    <span className="font-bold text-teal-700 dark:text-teal-400 font-mono text-sm">
                                        {department.appointments || 0}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-200/50 dark:border-gray-700/50">
                                    <span className="text-slate-500">Supported Care Modes:</span>
                                    <div className="flex gap-1">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                                            OPD Visit
                                        </span>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                            Video Consult
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 4. Affiliated Medical Staff Roster */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                    <Stethoscope className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                    <span>Doctors in this Department ({doctorsInDept.length})</span>
                                </h4>
                                <Link
                                    href={`/hospital/doctors?department=${encodeURIComponent(department.name)}`}
                                    className="text-[11px] font-bold text-teal-600 hover:underline flex items-center gap-0.5"
                                >
                                    <span>View Directory</span>
                                    <ExternalLink className="w-3 h-3" />
                                </Link>
                            </div>

                            {doctorsInDept.length === 0 ? (
                                <div className="p-3.5 bg-slate-50 dark:bg-gray-800/40 rounded-2xl border border-slate-200/70 dark:border-gray-800 text-center text-slate-400 py-6">
                                    <Users className="w-6 h-6 mx-auto mb-1 text-slate-300 dark:text-slate-600" />
                                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                        No doctors currently assigned
                                    </p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        Assign doctors to {department.name} from the medical staff directory.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {doctorsInDept.map((doc) => (
                                        <div
                                            key={doc.id}
                                            className="p-3 bg-slate-50/80 dark:bg-gray-800/50 rounded-2xl border border-slate-200/70 dark:border-gray-800 flex items-center justify-between gap-3"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-8 h-8 rounded-xl bg-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                                    {doc.name ? doc.name[0].toUpperCase() : 'D'}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate">
                                                        Dr. {doc.name}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 truncate">
                                                        {doc.specialization || 'Clinical Specialist'} • {doc.employmentType || doc.designation || 'Full-Time'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <StatusBadge status={doc.status || 'active'} size="sm" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 5. Related Appointments Link */}
                        <div className="p-3.5 bg-slate-50 dark:bg-gray-800/40 rounded-2xl border border-slate-200/70 dark:border-gray-800 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    Department Appointments & Queue
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                    Filter and view appointments specifically for {department.name}.
                                </p>
                            </div>
                            <Link
                                href={`/hospital/appointments?department=${encodeURIComponent(department.name)}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-slate-50 text-teal-700 dark:text-teal-300 rounded-xl text-xs font-semibold shrink-0 transition-colors border border-slate-200/60 dark:border-gray-700 shadow-2xs"
                            >
                                <span>Appointments</span>
                                <ExternalLink className="w-3 h-3" />
                            </Link>
                        </div>

                        {/* 6. Administrative Actions */}
                        {canManageDepartments && (
                            <div className="pt-2 flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => onEdit(department)}
                                    className="flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    <span>Edit Department</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onDelete(department.id, department.name)}
                                    className="py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                                    title="Delete Department"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete</span>
                                </button>
                            </div>
                        )}

                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-slate-200/70 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/30 flex justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-200 dark:bg-gray-700 hover:bg-slate-300 dark:hover:bg-gray-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                            Close Workspace
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
