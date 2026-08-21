import React from 'react';
import { PortalType } from './SourceBadge';
import { getPortalBrandColor } from './SourceBreakdownCard';
import clsx from 'clsx';
import { Activity } from 'lucide-react';

export interface VaidideaContributionCardProps {
  portal: PortalType;
  className?: string;
}

export const VaidideaContributionCard: React.FC<VaidideaContributionCardProps> = ({ portal, className }) => {
  const brandColor = getPortalBrandColor(portal);
  // Safely extract background color to simulate an accent bar
  const bgClassMatch = brandColor.match(/bg-[a-z]+-50/);
  const accentClass = bgClassMatch ? bgClassMatch[0].replace('50', '500') : 'bg-gray-500';

  return (
    <div className={clsx('bg-white p-6 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden', className)}>
      <div className={clsx("absolute top-0 left-0 w-1 h-full", accentClass)} />
      
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Vaididea Network Contribution</h3>
          <p className="text-sm text-gray-500 mb-4">Percentage of business originating directly from Vaididea.</p>
        </div>
        <div className={clsx("p-2 rounded-lg", brandColor)}>
          <Activity className="w-5 h-5" />
        </div>
      </div>
      
      <div className="flex items-end gap-3 mt-2">
        <div className="text-3xl font-bold text-gray-300">--%</div>
      </div>
      <p className="text-xs font-medium text-gray-400 mt-2">Pending data enablement</p>
    </div>
  );
};
