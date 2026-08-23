
'use client';
import React from 'react';

export function ReferralFilters({ 
    status, 
    urgency, 
    onStatusChange, 
    onUrgencyChange 
}: { 
    status: string, 
    urgency: string, 
    onStatusChange: (v: string) => void,
    onUrgencyChange: (v: string) => void
}) {
    return (
        <div className="flex gap-4 mb-4">
            <select 
                className="p-2 border rounded text-sm bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                value={status}
                onChange={e => onStatusChange(e.target.value)}
            >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
            </select>

            <select 
                className="p-2 border rounded text-sm bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                value={urgency}
                onChange={e => onUrgencyChange(e.target.value)}
            >
                <option value="">All Urgencies</option>
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="emergency">Emergency</option>
            </select>
        </div>
    );
}
