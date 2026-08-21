import React from 'react';
import { PortalType } from './SourceBadge';
import clsx from 'clsx';

export interface SourceBreakdownCardProps {
  portal: PortalType;
  className?: string;
}

export const getPortalBrandColor = (portal: PortalType) => {
  switch (portal) {
    case 'diagnostic': return 'text-purple-600 bg-purple-50'; // Bright Brinjal
    case 'pharmacy': return 'text-orange-500 bg-orange-50'; // Pharmacy Orange
    case 'clinic': return 'text-blue-600 bg-blue-50';
    case 'doctor': return 'text-teal-600 bg-teal-50';
    case 'hospital': return 'text-indigo-600 bg-indigo-50';
    default: return 'text-gray-900 bg-gray-50';
  }
};

export const SourceBreakdownCard: React.FC<SourceBreakdownCardProps> = ({ portal, className }) => {
  // Empty state since analytics data is pending 093
  return (
    <div className={clsx('bg-white p-6 rounded-xl border border-gray-100 shadow-sm', className)}>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Acquisition Source Breakdown</h3>
      <p className="text-sm text-gray-500 mb-6">Business origin distribution for your portal.</p>
      
      <div className="flex items-center justify-center h-48 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-500">Source analytics pending</p>
          <p className="text-xs text-gray-400 mt-1">Data collection will begin after platform update</p>
        </div>
      </div>
    </div>
  );
};
