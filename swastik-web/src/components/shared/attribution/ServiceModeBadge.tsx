import React from 'react';
import { LucideIcon, Truck, Video, User, Building, MapPin, Store, Globe } from 'lucide-react';
import clsx from 'clsx';

export type ServiceMode = 
  | 'online'
  | 'video'
  | 'in_person'
  | 'clinic'
  | 'home_visit'
  | 'walk_in'
  | 'home_collection'
  | 'pickup'
  | 'pos'
  | 'delivery';

interface ServiceModeBadgeProps {
  mode: ServiceMode;
  className?: string;
}

const getModeConfig = (mode: ServiceMode) => {
  switch (mode) {
    case 'video':
      return { label: 'Video Consult', icon: Video, color: 'bg-amber-100 text-amber-700 border-amber-200' };
    case 'in_person':
    case 'clinic':
      return { label: 'In-Person', icon: User, color: 'bg-amber-100 text-amber-700 border-amber-200' };
    case 'home_visit':
      return { label: 'Home Visit', icon: MapPin, color: 'bg-amber-100 text-amber-700 border-amber-200' };
    case 'walk_in':
      return { label: 'Walk-in', icon: Building, color: 'bg-amber-100 text-amber-700 border-amber-200' };
    case 'home_collection':
      return { label: 'Home Collection', icon: Truck, color: 'bg-amber-100 text-amber-700 border-amber-200' };
    case 'pickup':
    case 'pos':
      return { label: 'Store Pickup', icon: Store, color: 'bg-amber-100 text-amber-700 border-amber-200' };
    case 'delivery':
      return { label: 'Delivery', icon: Truck, color: 'bg-amber-100 text-amber-700 border-amber-200' };
    case 'online':
    default:
      return { label: 'Online', icon: Globe, color: 'bg-amber-100 text-amber-700 border-amber-200' };
  }
};

export const ServiceModeBadge: React.FC<ServiceModeBadgeProps> = ({ mode, className }) => {
  const config = getModeConfig(mode);
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
