import React from 'react';
import { LucideIcon, User, Smartphone, Globe, Building, Hospital, Link, Building2 } from 'lucide-react';
import clsx from 'clsx';

export type PortalType = 'diagnostic' | 'pharmacy' | 'clinic' | 'doctor' | 'hospital';

export type SourceType = 
  | 'vaididea_app'
  | 'vaididea_web'
  | 'clinic_referral'
  | 'hospital_referral'
  | 'doctor_referral'
  | 'affiliate'
  | 'direct_walk_in'
  | 'direct_phone'
  | 'unknown';

interface SourceBadgeProps {
  source: SourceType;
  portal?: PortalType;
  className?: string;
}

const getSourceConfig = (source: SourceType) => {
  switch (source) {
    case 'vaididea_app':
      return { label: 'Vaididea App', icon: Smartphone, color: 'bg-purple-100 text-purple-700 border-purple-200' };
    case 'vaididea_web':
      return { label: 'Vaididea Web', icon: Globe, color: 'bg-purple-100 text-purple-700 border-purple-200' };
    case 'clinic_referral':
      return { label: 'Clinic Referral', icon: Building2, color: 'bg-blue-100 text-blue-700 border-blue-200' };
    case 'hospital_referral':
      return { label: 'Hospital Referral', icon: Hospital, color: 'bg-indigo-100 text-indigo-700 border-indigo-200' };
    case 'doctor_referral':
      return { label: 'Doctor Referral', icon: User, color: 'bg-cyan-100 text-cyan-700 border-cyan-200' };
    case 'affiliate':
      return { label: 'Affiliate', icon: Link, color: 'bg-pink-100 text-pink-700 border-pink-200' };
    case 'direct_walk_in':
      return { label: 'Direct (Walk-in)', icon: User, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    case 'direct_phone':
      return { label: 'Direct (Phone)', icon: Smartphone, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    case 'unknown':
    default:
      return { label: 'Unknown', icon: Globe, color: 'bg-gray-100 text-gray-700 border-gray-200' };
  }
};

export const SourceBadge: React.FC<SourceBadgeProps> = ({ source, className }) => {
  const config = getSourceConfig(source);
  const Icon = config.icon as LucideIcon;

  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
      config.color,
      className
    )}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
};
